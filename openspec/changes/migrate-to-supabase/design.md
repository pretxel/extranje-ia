## Context

RAG and application data currently live on an unmanaged Postgres reached through a single `DATABASE_URL`. Two clients touch it:
- **Prisma** (`src/lib/db/index.ts`) via `@prisma/adapter-pg` (`PrismaPg`), for app tables.
- **node-postgres `Pool`** (`src/lib/rag/vectorstore.ts`), handed to LangChain `PGVectorStore` for the `rag_vectors` table.

Embeddings are provider-agnostic (`src/lib/rag/providers/embeddings.ts`): OpenAI `text-embedding-ada-002` → 1536 dims, Google → 768 dims. `rag_vectors` is created by `PGVectorStore.initialize()` with a fixed dimensionality, so the embedding model used at ingest time is baked into the stored vectors.

This change relocates that single Postgres to Supabase with **zero behavior change**. Auth (Clerk) and the scraper scheduler (`node-cron`) are untouched and out of scope.

## Goals / Non-Goals

**Goals:**
- Host all app tables + `rag_vectors` on one Supabase Postgres.
- Migrate existing rows and embeddings with no re-embedding.
- Adopt Supabase's pooled (runtime) vs direct (migrations/ingest) connection model correctly.
- Verify retrieval parity before cutover; keep rollback to an env change.

**Non-Goals:**
- No scraper scheduling change (`node-cron` stays as-is this phase).
- No auth change (Clerk stays; `User.clerkId` unchanged).
- No RLS adoption (Prisma connects with a privileged role and bypasses RLS; introducing RLS here would be inert and is deferred to the auth phase).
- No embedding model / dimensionality change; no schema redesign.

## Decisions

### D1 — Migrate via `pg_dump`/restore, including `rag_vectors`
Dump the source database (app tables + `rag_vectors`) and restore into Supabase. Embeddings move as data.
- **Why:** vectors are plain `vector`-typed rows; restoring them preserves values exactly and avoids re-running the (paid, slow) embedding step. Same model ⇒ stored vectors remain valid.
- **Alternative considered — re-ingest from scratch** (`pnpm ingest` against Supabase): simpler tooling but recomputes every embedding (cost + time) and risks scraper-output drift vs current corpus. Rejected.
- **Pitfall:** the `vector` extension must exist in Supabase *before* restoring `rag_vectors`, else the type is unknown. Enable `create extension vector` first. Restore `vector` data after extension creation; if `pg_dump` emits its own `CREATE EXTENSION`, allow/ignore-if-exists.

### D2 — Two connection URLs: pooled for runtime, direct for migrations
Runtime (Prisma queries + LangChain `Pool`) → **pooled** URL (pgBouncer transaction mode, port 6543). Prisma **migrations** + ingestion → **direct** URL (port 5432).
- **Why:** Supabase fronts Postgres with pgBouncer for serverless-style connection churn. Transaction-mode pooling does not support session-level features (prepared statements, advisory locks) that Prisma migrations need — those must use the direct connection.
- **Implementation:** `DATABASE_URL` = pooled; add `DIRECT_URL` = direct. Prisma datasource gets `directUrl = env("DIRECT_URL")`. Prisma 7 here puts the URL in `prisma.config.ts` (loaded from env) rather than `schema.prisma` — wire both there. The LangChain `Pool` uses the pooled URL. Append `?pgbouncer=true` (and, if needed, `connection_limit=1`) to the pooled URL per Prisma's pgBouncer guidance.
- **Alternative considered — direct URL everywhere:** simplest, but loses pooling and risks connection exhaustion under concurrent requests. Rejected for runtime; kept only for migrations.
- **VERIFY before coding:** exact pooler host/port and the precise Prisma + Supabase pgBouncer flag set against current Supabase docs — these strings change.

### D3 — Parity-gated cutover with env-only rollback
Stand up Supabase alongside the source. Verify `findRelevantChunks` returns equivalent top-k for representative queries, then cut over by switching env URLs. Keep the source reachable until verified.
- **Why:** the only externally observable risk is retrieval drift; gate on it directly. No schema/code change means rollback is just repointing URLs.
- **Drift control:** freeze writes (low traffic window) or take the final dump immediately before cutover; the app is read-heavy on `documents`/`rag_vectors` (writes only via ingestion + user rows), so a short freeze is cheap.

## Risks / Trade-offs

- **`vector` extension missing/ordering at restore** → enable extension first; verify with `pg_extension` before restoring vectors (Spec: "Vector extension present").
- **Prisma migration fails against the pooler** (prepared-statement error) → route migrations through `DIRECT_URL`; never run `db:migrate` on the pooled URL (Spec: "Migrations use direct URL").
- **Connection exhaustion under load on direct URL** → runtime uses the pooler; `connection_limit`/`pgbouncer=true` on the pooled URL.
- **Data drift between dump and cutover** → write freeze or re-sync window (Spec: "No drift during cutover").
- **Credential leakage** → both URLs and DB password are server-only env; assert no `NEXT_PUBLIC_*` exposure (Spec: "Credentials are server-only").
- **Dimensionality mismatch if `AI_EMBEDDING_PROVIDER` differs between source and target env** → migration must run with the same provider/dims the source was ingested with; verify post-restore (Spec: "Dimensionality unchanged").

## Migration Plan

1. Create Supabase project; capture pooled + direct URLs and DB password into server-only secrets.
2. `create extension if not exists vector;` on Supabase.
3. `pg_dump` source (app tables + `rag_vectors`) → restore into Supabase (extension first).
4. Verify table presence + row counts and `rag_vectors` dimensionality.
5. Add `DIRECT_URL`; wire pooled URL into `DATABASE_URL`, direct into Prisma datasource (`prisma.config.ts` / `directUrl`); point LangChain `Pool` at pooled URL.
6. Run `pnpm db:generate`; dry-run `pnpm db:migrate` against `DIRECT_URL` (expect no-op / clean).
7. Parity check: run representative queries through `findRelevantChunks` against Supabase vs source; compare chunk IDs, metadata, scores within tolerance.
8. Cutover during a write freeze / final re-sync; monitor.
9. **Rollback:** repoint `DATABASE_URL`/`DIRECT_URL` to the source. No code or schema revert.
10. Decommission source only after a soak period.

## Open Questions

- Exact Supabase pooler connection strings + the current Prisma pgBouncer flag set — **verify against live Supabase/Prisma docs before wiring** (D2).
- Migration tooling for the cutover: Supabase CLI (`supabase db dump` / migrations) vs raw `pg_dump`/`psql` — pick based on whether the Supabase CLI is adopted for this repo.
- Write-freeze window vs logical re-sync for drift control — depends on acceptable downtime at cutover.
- Source DB host/credentials access for the dump (not in repo) — needed before step 3.

## Implementation Notes (during apply)

- **Source was empty → D1 invalidated.** The Neon source held 1 document, 0 chunks, 0 vectors (embeddings had never succeeded there). The `pg_dump`/restore "no re-embedding" rationale (D1) was moot — nothing to preserve. Switched to **Plan A**: `prisma migrate deploy` for schema (Prisma-native, keeps `_prisma_migrations` consistent) + `pnpm ingest` for a fresh corpus. `rag_vectors` is auto-created by `PGVectorStore.initialize()` at 1536 dims.
- **Connection wiring confirmed in practice.** `prisma migrate deploy` connected via `DIRECT_URL` (session pooler, 5432); ingestion run was forced onto the session connection (`DATABASE_URL=<DIRECT_URL>`) to avoid transaction-pooler (6543) DDL/prepared-statement issues when creating + bulk-loading `rag_vectors`. Runtime app still uses the pooled `DATABASE_URL` (6543).
- **Ingest blocked on OpenAI quota.** `429 InsufficientQuotaError` — the OpenAI key has no billing/credits. Corpus population is blocked until credits are added, a funded key is supplied, or the embedding provider is switched (Google, 768 dims → requires recreating `rag_vectors`). This is an external account issue, not a code/infra one.
- **RLS disabled on all public tables (Supabase advisor, ERROR/EXTERNAL).** `public` is exposed via the Data API (PostgREST) to the anon key. This app accesses Postgres only through Prisma (owner role → bypasses RLS), so enabling RLS with no policies closes the Data API hole at zero app cost. Not auto-applied — user decides (defer full policy design to the gated `supabase-auth` phase).
- **Minor:** `vector` extension installed in `public` (advisor WARN). Common/benign for LangChain PGVectorStore; moving schemas risks `search_path` breakage. Left as-is.
