# QA Report — Extranjería.ai

## What was validated

### Files reviewed
- `src/types/index.ts` — shared types barrel
- `src/lib/db/schema.ts` — Drizzle ORM schema (PostgreSQL + pgvector)
- `src/lib/db/index.ts` — DB client instantiation
- `src/lib/rag/types.ts` — RAG-specific types (`ScrapedDocument`, `DocumentChunk`, `RAGResult`)
- `src/lib/rag/chunker.ts` — sentence-aware chunker with overlap
- `src/lib/rag/embeddings.ts` — OpenAI batched embeddings (batch size 100)
- `src/lib/rag/pipeline.ts` — ingestion pipeline
- `src/lib/rag/retrieval.ts` — pgvector cosine similarity query
- `src/lib/rag/index.ts` — RAG barrel exports
- `src/lib/scraper/boe.ts` — BOE search scraper (3 pages)
- `src/lib/scraper/sede.ts` — SEDE procedures scraper
- `src/lib/scraper/index.ts` — scraper orchestrator
- `src/lib/claude.ts` — Anthropic client + `buildSystemPrompt`
- `src/lib/chat-types.ts` — canonical chat/user types
- `src/app/api/chat/route.ts` — SSE streaming chat API
- `src/components/chat/ChatInterface.tsx` — React SSE consumer

---

## Issues found

### 1. Duplicate type definitions (FIXED)
**File:** `src/types/index.ts`
**Problem:** This file duplicated `ChatMessage`, `SourceCitation`, `UserPlan`, and `PLAN_LIMITS` verbatim from `src/lib/chat-types.ts`. If either file was edited, the two would diverge silently. Additionally, `RAGChunk` was defined here but nowhere else, and nothing imported it — making it dead/orphan code.
**Fix:** Converted `src/types/index.ts` to re-export from `src/lib/chat-types.ts` (the canonical source used by all app code) and kept `RAGChunk` as a single definition here with a clarifying comment.

### 2. Clerk auth() usage — OK
`src/app/api/chat/route.ts` correctly calls `auth()` from `@clerk/nextjs/server` with `await`, matching the v6 async API.

### 3. Pipeline DB imports — OK
`src/lib/rag/pipeline.ts` imports `{ db }` from `@/lib/db` and `{ documents, chunks }` from `@/lib/db/schema` — both files exist and export those names.

### 4. SSE stream format — OK
The API route emits `data: <text>\n\n` for text deltas and `data: {"type":"sources",...}\n\n` as a final event. `ChatInterface.tsx` splits on `\n\n`, strips the `data: ` prefix, and checks for `{"type":"sources"` before treating the line as text — this parsing is consistent with the emission format.

### 5. `@/` path aliases — OK
All `@/lib/...` and `@/lib/rag/...` imports resolve to files that exist. No dangling aliases found.

### 6. `scraper/index.ts` — minor unused import
`scrapeAll` imports `scrapeBOE` and `scrapeSede` for use inside the function, and also re-exports them. The top-level `import { scrapeBOE } from './boe'` line (line 2) is redundant given the `export { scrapeBOE }` on line 5 which re-exports directly. Not a breaking issue — TypeScript handles this fine.

---

## Test files created

| File | What it tests |
|---|---|
| `src/lib/rag/__tests__/chunker.test.ts` | `chunkDocument`: empty input, short text (1 chunk), long text (multiple chunks), overlap correctness, metadata field population, chunkIndex sequencing |
| `src/lib/rag/__tests__/embeddings.test.ts` | `embedTexts`: empty input, single batch, 1536-dim output, >100 items split into multiple batches, correct batch slices sent, correct model used |
| `src/lib/scraper/__tests__/boe.test.ts` | `scrapeBOE`: correct `source: 'boe'`, correct document shape, graceful HTTP error handling, no-throw on full failure, skips articles with no content |
| `src/lib/__tests__/claude.test.ts` | `buildSystemPrompt`: context included, legal disclaimer present, source citation instruction present, specialist referral present, different contexts produce different prompts |
| `src/app/api/chat/__tests__/route.test.ts` | `POST /api/chat`: 401 when unauthenticated, 200 streaming response when authenticated, `Content-Type: text/event-stream` header, text delta emitted as SSE lines, sources event emitted at end, non-text-delta events ignored |

---

## Test infrastructure added

- `package.json`: added `"test": "vitest"` and `"test:coverage": "vitest --coverage"` scripts
- `package.json`: added `vitest ^2.0.0`, `@vitest/coverage-v8 ^2.0.0`, `@testing-library/react ^16.0.0`, `@testing-library/jest-dom ^6.0.0`, `jsdom ^25.0.0` to `devDependencies`
- `vitest.config.ts`: created with `environment: node`, `globals: true`, and `@` path alias pointing to `./src`

---

## Remaining TODOs (require real environment)

- **RAG integration in chat route:** `src/app/api/chat/route.ts` has a `TODO` to call `findRelevantChunks()` instead of the placeholder context string. This requires a running PostgreSQL + pgvector instance.
- **Usage-limit enforcement:** The `TODO` to check `queriesUsed` against `PLAN_LIMITS` before processing is unimplemented. Needs DB access.
- **End-to-end scraper tests:** `boe.ts` and `sede.ts` depend on live third-party HTML structure. The mock-based tests validate happy/error paths but cannot catch upstream HTML changes.
- **`src/lib/rag/retrieval.ts` tests:** Uses raw SQL with `<=>` pgvector operator — requires a real database with the pgvector extension to integration-test.
- **Clerk webhook / user sync:** No code was found for syncing Clerk users into the `users` table. The `users` schema exists but is not populated from the chat route.
