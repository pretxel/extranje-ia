## 1. Provision Supabase

- [x] 1.1 Created project `extranjeria-ia` (ref `uyphszzbswsknknqibaz`, org Extrange.ia, eu-west-1, free $0/mo) via Supabase MCP — pooled/direct URLs + password still to be captured from dashboard
- [x] 1.2 Enabled `vector` extension via MCP `apply_migration` (`create extension if not exists vector;`)
- [x] 1.3 Verified `vector` 0.8.0 installed in `public` (MCP `list_extensions`)
- [x] 1.4 Source creds confirmed: `DATABASE_URL` in `.env` → Neon (us-east-1). `.env` is gitignored + untracked (no leak). Cross-cloud move: Neon → Supabase.

## 2. Migrate schema + corpus  (PIVOTED to Plan A — source was empty)

> Source Neon DB held 0 chunks / 0 vectors (1 doc, 0 embeddings). The spec's
> "pg_dump/restore, no re-embed" (design D1) was moot — nothing to preserve.
> Switched to: `prisma migrate deploy` (schema) + `pnpm ingest` (fresh corpus).

- [x] 2.1 `prisma migrate deploy` → Supabase via `DIRECT_URL`: created `users`, `documents`, `chunks`, `conversations`, `messages`, `_prisma_migrations`
- [x] 2.2 `rag_vectors` table auto-created by `PGVectorStore.initialize()` during ingest (1536-dim, ada-002)
- [x] 2.3 Verified schema via MCP `list_tables` (6 tables present)
- [x] 2.4 Corpus populated via `pnpm ingest` (OpenAI quota restored): 18 BOE laws → 309 vectors in `rag_vectors`, 1536-dim, 18/18 docs represented, 0 orphan vectors. (`chunks` table stays 0 — pipeline uses `rag_vectors`, not the legacy Prisma `chunks` table.)
- [x] 2.5 Reset partial state before re-ingest (`TRUNCATE public.documents, public.chunks CASCADE;` + `DELETE FROM public.rag_vectors;`) → clean 0/0/0 confirmed

## 2b. Security (Supabase advisor — surfaced during apply)

- [x] 2b.1 Enabled RLS (no policies) on all 7 public tables incl. `rag_vectors` → Data API access blocked; Prisma (owner) bypasses. Advisors: 0 ERROR remaining (7 INFO no-policy = expected; 1 WARN vector-in-public = benign).
- [ ] 2b.2 NOTE for re-ingest: if a provider switch DROPs+recreates `rag_vectors`, re-apply `ALTER TABLE public.rag_vectors ENABLE ROW LEVEL SECURITY;` (TRUNCATE keeps RLS, DROP loses it)

## 3. Wire connection URLs

- [ ] 3.1 Set `DATABASE_URL` to the pooled URL (append `?pgbouncer=true`, `connection_limit=1` per current Prisma/Supabase guidance — VERIFY exact flags against live docs)
- [ ] 3.2 Add `DIRECT_URL` = direct URL; expose both in env files (`.env.local`) and server-only deploy secrets
- [x] 3.3 Migrations use direct connection via `prisma.config.ts` — `datasource.url = DIRECT_URL ?? DATABASE_URL` (Prisma 7; falls back for single-DB dev)
- [x] 3.4 LangChain `Pool` in `src/lib/rag/vectorstore.ts` already reads `DATABASE_URL` (= pooled URL under the new model) — no change needed
- [x] 3.5 Verified: no `NEXT_PUBLIC_*` DB var; `DATABASE_URL` read only server-side (`vectorstore.ts`, `db/index.ts`, `prisma.config.ts`)
- [x] 3.6 `pnpm db:generate` — clean

## 4. Validate migrations and pooling

- [x] 4.1 `prisma migrate deploy` succeeded via `DIRECT_URL` (session 5432) — 2 migrations applied, no pooler/prepared-statement error
- [x] 4.2 Runtime RAG retrieval ran via pooled `DATABASE_URL` (6543) — `findRelevantChunks` returned results, confirming the pooled path works

## 5. Retrieval verification  (parity-vs-source N/A — Plan A fresh ingest, source was empty)

- [x] 5.1 Representative query smoke ("requisitos residencia por arraigo")
- [x] 5.2 `findRelevantChunks` returned 3 relevant chunks from the correct law (Reglamento LO de extranjería)
- [~] 5.3 N/A — no source corpus to diff against (Neon had 0 vectors); integrity verified instead (dims=1536, 0 orphans)
- [ ] 5.4 Cutover gate — production env still on Neon; flip to Supabase URLs is the user's call

## 6. Cutover and rollback readiness

- [~] 6.1 Drift freeze N/A — source was empty + fresh ingest (no source rows to drift from)
- [x] 6.2a Disconnected Vercel↔Neon integration (POSTGRES_* values cleared from prod pull)
- [x] 6.2b Set prod `DATABASE_URL`=Supabase pooled (6543, pgbouncer=true) + `DIRECT_URL`=session (5432) via Vercel REST API (CLI `env add` stores empty — reads value from /dev/tty, not stdin). Verified populated + correct host/port.
- [x] 6.2c ACTIVATED: `vercel --prod` deployed (dpl_D3PzyRhmBjGhACSdFUDquHf8pUZB, READY) → https://extranje-ia.vercel.app. Build 33s on Supabase env.
- [~] 6.2d Smoke: homepage 200, functions boot (auth-gated APIs 404 unauth via Clerk middleware = pre-DB, no 500). Authenticated DB-path smoke (login → chat) still pending — can't exercise without a Clerk session; Supabase pooled conn already proven locally with identical prod creds.
- [ ] 6.3 Rollback path: re-add prod `DATABASE_URL` with the Neon value (or reconnect Neon integration); leftover `POSTGRES_URL_NON_POOLING`/`DATABASE_URL_UNPOOLED` still hold Neon refs. No code/schema revert needed.
- [ ] 6.4 Keep Neon DB alive through soak period before decommissioning
- [ ] 6.5 NOTE: Preview/Development envs — `DATABASE_URL` may now be unset there (old entry rm'd); set if preview deploys are used. Local dev unaffected (uses `.env.local`).

## 7. Verify

- [x] 7.1 `pnpm vitest run` — 54/54 pass
- [x] 7.2 `pnpm lint:biome` — clean (56 files)
- [~] 7.3 Retrieval path smoke-tested against Supabase (`findRelevantChunks` → relevant cited chunks). Full chat-UI smoke deferred to production cutover.
