# Local verification harness — `improve-chat-ux`

End-to-end validation of the RAG chat (`/api/chat` + `ChatInterface`) against a
**local Supabase stack** and a real OpenAI key — without touching prod or
requiring a magic-link login. Built to verify the `improve-chat-ux` change
(conversation persistence, usage sync, no "Fuentes", 402/error UX).

## Prerequisites

- Docker running, Supabase CLI (`supabase`), `pnpm`.
- A real `OPENAI_API_KEY` in `.env` (the chat model + embeddings call OpenAI).
- Local stack up: `supabase start` (first run pulls images).

## What it does

| Step | |
|---|---|
| capture env | reads `supabase status -o env` → local API/DB URLs + keys |
| migrate | `prisma migrate deploy` against the local DB (creates `pgvector`, app tables) |
| seed | creates a confirmed user via the GoTrue admin API (idempotent) |
| serve | `next dev` with shell env overriding `.env.local` → local Supabase + real OpenAI |
| drive | mints a session through `@supabase/ssr`'s own client (in-memory jar → the exact `sb-…-auth-token` cookie the server decodes), then exercises the surface |

The empty corpus is fine: `PGVectorStore.initialize` auto-creates `rag_vectors`,
search returns `[]`, the LLM answers "no verified context" (the
answer-only-from-context rule, observable).

## Run

```bash
supabase start                          # bring the stack up
bash scripts/verify-local/run.sh        # API: streams, persistence, restore, usage, 402
bash scripts/verify-local/run-ui.sh     # UI (chromium): no-Fuentes, live counter, at-limit banner
                                        #   run-ui.sh also runs `supabase stop` at the end
```

`run-ui.sh` writes `shot-chat.png` / `shot-limit.png` (gitignored).

## Files

- `run.sh` — API-level orchestrator (server-side scenarios).
- `run-ui.sh` — Playwright orchestrator (rendered UI) + stack teardown.
- `drive.mjs` — authed API driver (Node, `@supabase/ssr` + `pg`).
- `ui.spec.mjs` / `playwright.config.mjs` — browser driver.

## Notes

- The 402 path bumps `users.queries_used` directly in the local DB to reach the
  cap (documented in `drive.mjs` / `ui.spec.mjs`); the gate + response are the
  real code under test.
- Everything targets `127.0.0.1` (local stack) — no prod writes, ~2 OpenAI
  calls per full run.
