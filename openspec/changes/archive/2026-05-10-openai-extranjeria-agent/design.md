## Context

Repo already ships a single-shot RAG chat at `src/app/api/chat/route.ts`: extract last user text → `findRelevantChunks` → inject as `system` context → `streamText`. Embeddings + LLM go through a provider factory (`src/lib/rag/providers/{embeddings,llm}.ts`) that swaps OpenAI ↔ Google by env. Documents live in Postgres `Document` (Prisma) + `rag_vectors` (LangChain PGVectorStore). Auth via Clerk; plan limits via `hasReachedLimit`.

The new agent surface needs to (a) reason across multiple retrievals in one turn and (b) detect/report changes in extranjería documentation and residency rules. That requires tool calling, not single-shot context injection.

## Goals / Non-Goals

**Goals:**
- Agentic loop with tools (Vercel AI SDK `streamText({ tools, stopWhen })`).
- OpenAI-only path on this surface: `text-embedding-3-small` (1536) + `gpt-4o`.
- First-class "what changed since X" capability backed by `Document.updatedAt`.
- Reuse existing auth, plan limits, conversation persistence, source-url stream parts.
- Stream tool calls and partial answers to the UI.

**Non-Goals:**
- Replacing `/api/chat` — old endpoint stays for backward compat.
- Adding a new vector store or re-embedding the corpus (3-small is also 1536 dims; index stays).
- Real-time BOE polling / cron-based change alerts (Phase 3 — out of scope here).
- Multi-provider on the agent route — explicitly OpenAI-only to remove drift.

## Decisions

### D1. Tool-calling agent via `streamText({ tools, stopWhen })`
**Choice:** Vercel AI SDK v6 `streamText` with a tools map and `stopWhen: stepCountIs(5)`.
**Why:** Already a dependency; `useChat` on the client already handles `tool-call` / `tool-result` parts. Keeps streaming + source-url parts working unchanged.
**Alternatives:**
- LangChain agent executor — heavier, redundant with AI SDK already wired.
- Hand-rolled tool loop — reinvents what `streamText` gives us free.

### D2. Tools (typed with `zod`)
- `searchExtranjeriaCorpus({ query: string, k?: number })` → `{ chunks: Array<{ content, documentTitle, documentUrl, score }> }`. Wraps `findRelevantChunks`.
- `listRecentDocumentChanges({ sinceDays?: number })` → Prisma `document.findMany` filtered by `updatedAt >= now - sinceDays`, ordered desc, capped at 20. Backed by the new `Document.updatedAt` column (see D8).
- `fetchDocumentDetail({ documentId: string })` → returns `{ title, url, updatedAt, summary }` for citation expansion.

**Why these three:** match the two user intents (Q&A + change tracking) without scope creep. Each tool is read-only, idempotent, cheap.

### D3. OpenAI lock on agent route
Construct provider clients inline in `src/lib/agent/providers.ts` instead of going through `createLLMProvider()` / `createEmbeddingProvider()`. Models read from `OPENAI_AGENT_MODEL` (default `gpt-4o`) and `OPENAI_AGENT_EMBEDDING_MODEL` (default `text-embedding-3-small`).
**Why:** the factory's purpose is multi-provider; agent route is intentionally single-provider. Keeping it inline prevents `AI_EMBEDDING_PROVIDER=google` from silently breaking the agent.
**Alternative considered:** add `forceProvider` arg to factory — leaks agent concerns into shared layer.

### D4. Embedding model swap (ada-002 → 3-small)
Both are 1536 dims, so the `rag_vectors` index works without re-ingest. New ingests use 3-small. Mixed-model retrieval is acceptable short-term per OpenAI guidance (cosine still meaningful), and a re-embed task is captured but optional.
**Risk noted in R2.**

### D5. Plan limits
One agent turn (regardless of tool hops) increments `queriesUsed` by 1 — same as current chat. Tools do not count. Counter increments in `onFinish` like today.
**Why:** users price by turn, not by token. Tool-loop cost is the platform's concern, not the user's quota.

### D6. UI surface
New route `src/app/dashboard/agent/page.tsx` + `src/components/agent/AgentChat.tsx` that renders tool-call and tool-result parts inline (collapsed by default). Reuses `SourceCard`, `UsageBanner`, `ChatInput`.
**Why:** users need to see *why* the agent says "this rule changed" — tool transparency builds trust for legal-adjacent answers.

### D7. System prompt
Extends `buildSystemPrompt` with agent-mode block: "Use `searchExtranjeriaCorpus` for any factual claim. Use `listRecentDocumentChanges` when user asks about updates/changes/'lo nuevo'. Cite every claim with the URL returned by tools. Refuse to answer outside retrieved context. Add disclaimer."

### D8. Schema: real change tracking
Add `updatedAt DateTime @updatedAt @map("updated_at")` and `contentHash String? @map("content_hash")` to `Document`, plus `@@index([updatedAt])`. Rewrite `pipeline.ts` to:
1. Compute `sha256(content)` for each scraped doc.
2. `prisma.document.upsert` by URL — on conflict, only write `content`/`contentHash` (and re-chunk + re-embed) when the hash differs; otherwise touch nothing so `updatedAt` stays.
3. When content changes, delete prior `Chunk` rows + corresponding `rag_vectors` rows for that doc before re-embedding.

**Why:** current pipeline `if (existing) continue;` means re-scrapes are no-ops, so any change-tracking tool would always return empty. Without this, tasks 7/27/28 in the previous tasks list were unverifiable.
**Alternatives considered:**
- Repurpose `verifiedAt` — semantically muddy ("last reviewed" vs. "last changed").
- Skip change-tracking tool — drops a primary user requirement.

## Risks / Trade-offs

- **R1. Tool-loop cost** → 5-step cap (`stepCountIs(5)`); log step count per turn; alert if p95 > 3.
- **R2. Mixed embedding models in `rag_vectors`** (ada-002 + 3-small) → quality drift on retrieval. Mitigation: capture optional re-embed task; add `embeddingModel` metadata column on next ingest write so we can filter/segment later.
- **R3. `Document.updatedAt` would fire on any write** → mitigated by D8: the pipeline only writes when `contentHash` differs, so `updatedAt` reflects real content change.
- **R4. Agent hallucinates citations not present in tool output** → strict system prompt + post-hoc check that every URL emitted as `source-url` part exists in tool results from this turn. Drop unknown URLs.
- **R5. Plan-limit bypass via switching surfaces** → both `/api/chat` and `/api/agent` use shared `hasReachedLimit`; OK.
- **R6. Clerk middleware miss** → add `/api/agent(.*)` and `/dashboard/agent(.*)` to protected matcher; verify with curl in tasks.

## Migration Plan

1. Ship behind feature flag env `AGENT_CHAT_ENABLED=true`; nav link hidden when false.
2. Deploy preview → smoke test with seed extranjería questions + a "qué ha cambiado en los últimos 30 días" probe.
3. Enable in prod for staff users only (Clerk role check) for 1 week.
4. Open to all paid plans; free plan still capped at 5 queries/month combined across `/api/chat` + `/api/agent`.

**Rollback:** unset `AGENT_CHAT_ENABLED`; route returns 404. No DB rollback needed.

## Open Questions

- Q1: Should `listRecentDocumentChanges` default `sinceDays` to 30 or 90? — default 30, override in prompt.
- Q2: Re-embed full corpus to 3-small now, or lazy-migrate on next scrape? — defer; lazy-migrate, log retrieval-quality metric.
- Q3: Show raw tool JSON in UI or only a summary chip? — chip + expand-on-click.
