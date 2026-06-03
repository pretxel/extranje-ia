# LangChain + OpenAI RAG generation in `/api/chat`

**Date:** 2026-06-03
**Status:** Approved (design)

## Goal

Move the chat answer generation in `/api/chat` from the Vercel AI SDK
(`streamText` + multi-provider `createLLMProvider`) to a LangChain generation
chain backed by OpenAI (`ChatOpenAI`), reusing the existing LangChain RAG
retriever. Streaming, source citations, plan limits, and Clerk auth are
preserved. Chat locks to OpenAI; the dead multi-provider abstraction is removed.

## Context (current state)

- **Retrieval** already runs on LangChain: `findRelevantChunks()`
  (`src/lib/rag/retrieval.ts`) wraps `PGVectorStore.similaritySearchWithScore`
  and Prisma-joins document metadata (`title`, `url`, `source`, `verifiedAt`).
- **Generation** uses Vercel AI SDK `streamText({ model: createLLMProvider() })`
  in `src/app/api/chat/route.ts`. `createLLMProvider()`
  (`src/lib/rag/providers/llm.ts`) switches on `AI_CHAT_PROVIDER`
  (openai/anthropic/google).
- **UI** uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`
  (`src/components/chat/ChatInterface.tsx`); it consumes the AI SDK UI message
  stream protocol (`text-start`/`text-delta`/`text-end`, `source-url` parts).
- AI SDK is v6.0.146. **No** LangChain adapter ships in `ai`, and
  `@ai-sdk/langchain` is not installed. Bridge must be manual.

## Approach

Within the chosen "generation via LangChain chain" scope, use
**retrieve-then-generate**:

1. Retrieve with the existing `findRelevantChunks()` — it returns both the
   context chunks and the Prisma-joined source metadata required for citations.
2. Feed the formatted context string into a LangChain LCEL generation chain.

Rejected alternative: a pure LCEL retriever-in-chain Runnable. The vector
metadata only carries `documentId`/`url`, not the joined `title`/`verifiedAt`,
so rich `source-url` citations would break.

## Architecture

```
/api/chat POST
  auth + plan limit                         (unchanged)
  findRelevantChunks(query, 5) -> ragResults (LangChain PGVectorStore, unchanged)
        |-- contextText  (formatted "[Fuente: title — url]\n content")
        |-- sources[]    ({ url, title })  -> source-url parts
  buildRagChain():  ChatPromptTemplate
                      -> ChatOpenAI({ temperature: 0, streaming: true })
                      -> StringOutputParser
  chain.stream({ context, history, question })  -> AsyncIterable<string>
  createUIMessageStream({ execute: writer => {
        write source-url parts            (one per source)
        text-start(id)
        for await chunk of stream: text-delta(id, chunk)
        text-end(id)
      },
      onFinish: increment queriesUsed })
  -> createUIMessageStreamResponse
```

## Components

| Unit | File | Responsibility |
|---|---|---|
| `createChatModel()` | `src/lib/rag/chain.ts` (new) | `ChatOpenAI` factory: model `OPENAI_CHAT_MODEL ?? "gpt-4o"`, `temperature: 0`, `streaming: true`, `apiKey: process.env.OPENAI_API_KEY` |
| `buildRagChain()` | `src/lib/rag/chain.ts` | LCEL runnable: `prompt -> createChatModel() -> StringOutputParser`. Prompt = system message from `buildSystemPrompt(context)` + `MessagesPlaceholder("history")` + human `{question}` |
| `toLangChainHistory(messages)` | `src/lib/rag/chain.ts` | Map prior `UIMessage[]` to `HumanMessage`/`AIMessage` (concatenated text parts), excluding the final user message |
| `formatContext(ragResults)` | `src/lib/rag/chain.ts` | Build the context string (current `[Fuente: …]` format) + `sources[]`; extracted so it is unit-testable |
| route rewrite | `src/app/api/chat/route.ts` | retrieve -> formatContext -> chain.stream -> bridge to writer; keep auth, plan-limit, `onFinish` increment, `source-url` emission |

`buildSystemPrompt(context)` (`src/lib/openai.ts`) is reused verbatim — it
already injects context and the disclaimer/citation rules.

## Data flow

- `question` = text of the last user message (current extraction logic).
- `history` = all messages before the last user message, mapped to LangChain
  messages. Multi-turn preserved (no regression).
- `context` = `formatContext(ragResults)` — same `[Fuente: title — url]\n body`
  joined by `---`; falls back to "No se encontró contexto relevante…" when
  empty.
- `sources` = `ragResults.map(r => ({ url, title }))` -> `source-url` parts,
  emitted before the text stream (unchanged behavior).

## Streaming bridge

`chain.stream()` ending in `StringOutputParser` yields `string` chunks. Inside
`createUIMessageStream`'s `execute(writer)`:

1. Emit each `source-url` part (as today).
2. Emit `{ type: "text-start", id }` with a single stable id.
3. For each streamed chunk emit `{ type: "text-delta", id, delta: chunk }`.
4. Emit `{ type: "text-end", id }`.

Part shapes verified against `ai@6.0.146` `dist/index.d.ts`. `useChat`
reconstructs the assistant text from the delta sequence — UI unchanged.

## Removals (dead multi-provider chat abstraction)

- Delete `src/lib/rag/providers/llm.ts` (`getChatProvider`, `createLLMProvider`,
  `ChatProvider`).
- Delete `src/lib/rag/__tests__/providers/llm.test.ts` (tests the removed
  multi-provider switch).
- Remove the `createLLMProvider` re-export at `src/lib/rag/index.ts:4`.
- `.env.example`: remove `AI_CHAT_PROVIDER` and the anthropic/google chat
  provider lines that only mattered when `AI_CHAT_PROVIDER` was non-openai.
  Keep `OPENAI_CHAT_MODEL`.
- Embeddings provider is untouched (`AI_EMBEDDING_PROVIDER` stays — separate
  concern, still OpenAI by default).
- `@ai-sdk/anthropic` / `@ai-sdk/google` package deps: check for any remaining
  importer (the agent route uses its own OpenAI-locked `agentChatModel`). Remove
  from `package.json` only if no importer remains; otherwise leave and note it.

## Error handling

- No relevant chunks -> context = "No se encontró contexto relevante…"; the
  system prompt makes the model decline. Unchanged.
- Missing `OPENAI_API_KEY` -> `ChatOpenAI` throws -> surfaced as a 500.
- LLM / stream error inside `execute` -> propagates through the UI message
  stream (same failure surface as the current `streamText` path).
- Auth (`401`) and plan-limit (`402`) guards unchanged and run before retrieval.

## Testing

- Vitest unit on `src/lib/rag/chain.ts`:
  - `formatContext()` — correct `[Fuente: …]` formatting, separator, empty-input
    fallback, and `sources[]` shape.
  - `toLangChainHistory()` — excludes the final user message; maps roles to
    `HumanMessage`/`AIMessage`; concatenates multiple text parts; ignores
    non-text parts.
  - `buildRagChain()` wiring with a mocked `ChatOpenAI` — assert the prompt
    receives `context`/`history`/`question` and output is parsed to a string.
- Route-level streaming is verified manually (integration), not unit-tested.
- Follow TDD: write the `chain.ts` tests first, then implement.

## Out of scope

- The `/api/agent` route (separate, already OpenAI-locked on its own factory).
- The embeddings provider abstraction.
- Any UI changes to `ChatInterface` / `MessageBubble`.
```

