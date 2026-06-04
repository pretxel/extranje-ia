## Why

RAG and application data run on an unmanaged Postgres while scheduling and auth needs are growing. Moving the database to Supabase Postgres first establishes one managed Postgres (with `vector` extension and DB-native scheduling available later) as the single source of truth — a low-risk foundation that ships on its own and unblocks later scraper-scheduling and auth work without coupling to them.

## What Changes

Scope of **this** change is Phase 1 only — the database/RAG host move. It is independently shippable and changes no application behavior.

- Provision a Supabase project and enable the `vector` extension on its Postgres.
- Migrate existing data — `documents`, `chunks`, `users`, `conversations`, `messages` — and the LangChain-managed `rag_vectors` table to Supabase via `pg_dump`/restore. Same embedding model → **no re-embedding**.
- Adopt Supabase's two-URL connection model: a **pooled** URL (pgBouncer, port 6543) for the app/runtime, a **direct** URL (port 5432) for Prisma migrations and ingestion.
- Update connection wiring (`src/lib/db/index.ts`, `src/lib/rag/vectorstore.ts`, `prisma.config.ts`, env) to read the new URLs. No change to `PGVectorStore`, retrieval logic, the embeddings provider abstraction, the chat/agent routes, or Clerk.
- Verify retrieval parity: same query returns equivalent top-k chunks against Supabase as before the move.

### Deferred (separate future changes, NOT in this scope)
- **`scheduled-ingestion`** — replace `node-cron` with a triggerable endpoint scheduled via Supabase pg_cron + pg_net. Gated on deploy-target decision (serverless vs always-on).
- **`supabase-auth`** — replace Clerk with Supabase Auth (BREAKING; drops `User.clerkId`). Gated on auth motivation (cost vs RLS vs consolidation).

## Capabilities

### New Capabilities
- `supabase-database`: Application data and RAG vectors hosted on Supabase Postgres — `vector` extension enablement, pooled-vs-direct connection strategy, one-time data + vector migration with no re-embedding, and verified retrieval parity post-move.

### Modified Capabilities
<!-- None. No spec-level requirement change to existing capabilities; this change relocates the database host only and preserves all current behavior, including the `extranjeria-agent-chat` capability. -->

## Impact

- **Code:** `src/lib/db/index.ts` (pooled URL), `src/lib/rag/vectorstore.ts` (pool connection string), `prisma.config.ts` + Prisma datasource (direct URL for migrations), env files (`DATABASE_URL` pooled + new `DIRECT_URL`).
- **Infra:** new Supabase project; `vector` extension; connection-pooler settings.
- **Data:** one-time `pg_dump`/restore of five app tables plus `rag_vectors`. Cutover requires a brief write freeze or re-sync to avoid drift.
- **Dependencies:** none added/removed in this phase (`pg`, `@prisma/adapter-pg`, LangChain `PGVectorStore` all unchanged).
- **Security:** keep DB credentials in server-only env (never `NEXT_PUBLIC_*`); restrict the Supabase DB password / connection string to runtime secrets.
- **Risk / rollback:** keep the old database reachable until parity is verified; rollback = point env URLs back to the old host. No schema or behavior change to revert.
