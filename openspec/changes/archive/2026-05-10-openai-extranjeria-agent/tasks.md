## 1. Provider lock + env

- [x] 1.1 Add `OPENAI_AGENT_MODEL` (default `gpt-4o`) and `OPENAI_AGENT_EMBEDDING_MODEL` (default `text-embedding-3-small`) to `.env.example`
- [x] 1.2 Add `AGENT_CHAT_ENABLED` flag to `.env.example` (default `false`)
- [x] 1.3 Create `src/lib/agent/providers.ts` exporting `agentChatModel()` (returns `openai(process.env.OPENAI_AGENT_MODEL ?? "gpt-4o")`) and `agentEmbeddings()` (returns `new OpenAIEmbeddings({ model: process.env.OPENAI_AGENT_EMBEDDING_MODEL ?? "text-embedding-3-small" })`)
- [x] 1.4 Throw a clear error in both factories when `OPENAI_API_KEY` is missing

## 2. Tools

- [x] 2.1 Create `src/lib/agent/tools.ts` exporting a `buildAgentTools()` function returning a typed AI SDK tools map
- [x] 2.2 Implement `searchExtranjeriaCorpus` tool using `findRelevantChunks(query, k)`; clamp `k` to `[1,10]`, default 5; map to `{ chunks: [{ content, documentTitle, documentUrl, score }] }`
- [x] 2.3 Implement `listRecentDocumentChanges` tool: zod-validate `sinceDays` in `[1,365]` default 30; `prisma.document.findMany({ where: { updatedAt: { gte: ... } }, orderBy: { updatedAt: "desc" }, take: 20, select: { id, title, url, updatedAt } })`
- [x] 2.4 Implement `fetchDocumentDetail` tool: zod `documentId: string`; return `{ id, title, url, updatedAt, summary }` or `{ error: "not_found" }`
- [x] 2.5 Unit tests in `src/lib/agent/__tests__/tools.test.ts` covering happy paths, validation errors, empty results

## 3. API route

- [x] 3.1 Create `src/app/api/agent/route.ts` modeled on `src/app/api/chat/route.ts`
- [x] 3.2 Return 404 when `process.env.AGENT_CHAT_ENABLED !== "true"`
- [x] 3.3 Reuse Clerk auth, user upsert, and `hasReachedLimit` 402 path verbatim
- [x] 3.4 Build agent system prompt (see task 4.1) and call `streamText({ model: agentChatModel(), system, messages: convertToModelMessages(messages), tools: buildAgentTools(), stopWhen: stepCountIs(5) })`
- [x] 3.5 In `onFinish`, increment `User.queriesUsed` by 1
- [x] 3.6 Wrap with `createUIMessageStream` and merge tool-call/tool-result + filtered `source-url` parts (only URLs returned by tools this turn)
- [x] 3.7 Integration test in `src/app/api/agent/__tests__/route.test.ts` covering 401, 402, 404 (flag off), and a happy-path stream that emits at least one `source-url` part

## 4. Prompt + citation safety

- [x] 4.1 Extend `src/lib/openai.ts` (or new `src/lib/agent/prompt.ts`) with `buildAgentSystemPrompt()` requiring tool-grounded answers, citation discipline, and the standard disclaimer
- [x] 4.2 Implement a URL allow-list filter so emitted `source-url` parts must come from this turn's tool results
- [x] 4.3 Test that an answer with hallucinated URLs gets those URLs stripped from the stream

## 5. Middleware

- [x] 5.1 Update `src/middleware.ts` matcher to protect `/api/agent(.*)` and `/dashboard/agent(.*)` (covered by existing `/dashboard(.*)` matcher)
- [ ] 5.2 Manual curl check: unauthenticated `POST /api/agent` returns 401 (deferred — needs live server)

## 6. UI surface

- [x] 6.1 Create `src/components/agent/AgentChat.tsx` based on `ChatInterface.tsx`, pointing `DefaultChatTransport` at `/api/agent`
- [x] 6.2 Render `tool-call` and `tool-result` UI message parts as collapsible chips (default collapsed, expand-on-click shows JSON)
- [x] 6.3 Reuse `SourceCard`, `UsageBanner`, `ChatInput`, `MessageBubble` (used `AgentMessageBubble` derived from `MessageBubble` to add tool-chip rendering)
- [x] 6.4 Create `src/app/dashboard/agent/page.tsx` rendering `<AgentChat />`
- [x] 6.5 Hide nav link to `/dashboard/agent` when `AGENT_CHAT_ENABLED !== "true"` (server-side check in `dashboard/layout.tsx`)

## 7. Schema + ingest pipeline for change tracking

- [x] 7.1 Add `updatedAt DateTime @updatedAt @map("updated_at")` and `contentHash String? @map("content_hash")` to `Document` in `prisma/schema.prisma`; add `@@index([updatedAt])`
- [x] 7.2 Wrote SQL migration `prisma/migrations/20260510000000_add_document_change_tracking/migration.sql`; user must run `pnpm db:migrate` to apply (loads pgcrypto, backfills `content_hash` via `digest(content,'sha256')`, sets `updated_at = scraped_at`, indexes `updated_at`)
- [ ] 7.3 Run `pnpm db:generate` (deferred — needs DB; `prisma generate` runs in `pnpm build`)
- [x] 7.4 Rewrite `src/lib/rag/pipeline.ts`: compute `sha256(content)`, hash-aware update/insert by URL, re-chunk + re-embed only on change; on change, delete prior `Chunk` rows AND prior `rag_vectors` rows (`DELETE FROM rag_vectors WHERE metadata->>'documentId' = $1`) before re-adding
- [x] 7.5 Unit test: re-ingesting identical content does NOT call update or addDocuments; changed content updates row, deletes prior vectors+chunks, and re-embeds

## 8. Docs

- [x] 8.1 Add an "Agent chat" section to `README.md` with env vars, flag, and a curl example
- [x] 8.2 Note in `CLAUDE.md` that `/api/agent` is OpenAI-locked and ignores `AI_EMBEDDING_PROVIDER`

## 9. Verification

- [x] 9.1 `pnpm lint:biome && pnpm vitest run` green (49/49 tests, biome clean, `tsc --noEmit` clean)
- [ ] 9.2 Manual smoke: ask "¿qué es el TIE?" → answer cites at least one BOE URL (deferred — needs running app + DB + OPENAI_API_KEY)
- [ ] 9.3 Manual smoke: ask "¿qué documentación ha cambiado en los últimos 30 días?" → agent invokes `listRecentDocumentChanges` and lists results (deferred — needs migration applied + ingest run)
- [ ] 9.4 Manual smoke: free user hits the cap → 402 returned, no model call (deferred — needs running app)
