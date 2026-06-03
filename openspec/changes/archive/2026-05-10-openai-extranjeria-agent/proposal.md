## Why

Current chat answers single-turn extranjería questions from static RAG context. Users also need an agent that can detect and surface **changes** to residency documentation, permits, and BOE rulings — not just answer "what is a TIE." Standardizing on OpenAI (embeddings + model) removes provider drift after recent Google fallback work and gives one supported path.

## What Changes

- New agentic chat endpoint that runs a tool-calling loop (Vercel AI SDK `streamText` + `tools`) instead of single-shot RAG injection.
- Tools the agent can call:
  - `searchExtranjeriaCorpus(query, k)` — wraps existing `findRelevantChunks` over BOE corpus.
  - `listRecentDocumentChanges(since)` — queries `Document.updatedAt` / new ingest runs to surface changes in documentation and residency rules.
  - `fetchDocumentDetail(documentId)` — return full document metadata + canonical URL for citation.
- Force OpenAI for both embeddings (`text-embedding-3-small`, 1536 dims) and chat model (`gpt-4o`) for this agent surface. **BREAKING** for envs that flipped `AI_EMBEDDING_PROVIDER=google`: agent route ignores it.
- New `/api/agent/route.ts` (Clerk-protected, plan-limited, identical to `/api/chat`).
- New UI surface `src/components/agent/AgentChat.tsx` reusing `useChat` transport, with tool-call rendering.
- Persist agent runs in `Conversation` / `Message` (existing models).
- System prompt enforces: only answer from tool results; cite source URL + verification date; flag detected changes with effective date.
- Add `Document.updatedAt` (`@updatedAt`) and `Document.contentHash` columns; rewrite `pipeline.ts` to upsert by URL with hash compare so `updatedAt` only moves when content actually changes.

## Capabilities

### New Capabilities
- `extranjeria-agent-chat`: Agentic chat that answers extranjería questions and surfaces documentation/residency changes by invoking RAG-search and change-tracking tools, using OpenAI embeddings + model.

### Modified Capabilities
<!-- None — `openspec/specs/` is empty; chat route stays as-is. -->

## Impact

- Code: new `src/app/api/agent/route.ts`, new `src/lib/agent/tools.ts`, new `src/components/agent/*`, new route `src/app/dashboard/agent/page.tsx`.
- Reuses: `findRelevantChunks`, `prisma`, `hasReachedLimit`, `buildSystemPrompt` (extended), Clerk middleware (already protects `/api/**` patterns matching).
- Env: requires `OPENAI_API_KEY`; `OPENAI_EMBEDDING_MODEL` defaults to `text-embedding-3-small`. Agent route bypasses `AI_EMBEDDING_PROVIDER`.
- Data: adds `Document.updatedAt` + `Document.contentHash`; ingest pipeline becomes upsert-with-hash-compare so `updatedAt` reflects real content change.
- Cost: tool-loop = multiple LLM hops per query → counts as 1 against `queriesUsed` (same plan limit), but token spend rises. Note in design.
- Middleware: add `/api/agent/**` and `/dashboard/agent/**` to Clerk protected matcher.
- DB migration: one Prisma migration adds the two columns + an index on `updatedAt`.
