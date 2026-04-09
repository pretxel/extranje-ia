# Provider Factory Design

**Date:** 2026-04-09
**Status:** Approved
**Scope:** Decouple embeddings and LLM from hardcoded OpenAI; add Google as a free provider via factory pattern.

---

## Problem

The RAG pipeline and chat route hardcode OpenAI in three places:

1. `src/lib/rag/embeddings.ts` — singleton `OpenAIEmbeddings` export
2. `src/lib/rag/vectorstore.ts` — duplicates `OpenAIEmbeddings` instantiation independently
3. `src/app/api/chat/route.ts` — hardcodes `openai("gpt-4o")` from Vercel AI SDK

Switching providers requires editing multiple files. There is no abstraction layer.

---

## Goal

A single env var (`AI_PROVIDER`) switches both the embedding model and the LLM simultaneously. OpenAI remains the default. Google (Gemini 2.0 Flash + text-embedding-004) is the free alternative. Adding a third provider in the future requires touching only the two factory files.

---

## Approach: Simple factory functions

Two factory functions under `src/lib/rag/providers/`. Each reads `AI_PROVIDER` and returns the appropriate instance. No classes, no registry — a switch and a return.

---

## File Changes

### New files

**`src/lib/rag/providers/embeddings.ts`**

```ts
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";

export function createEmbeddingProvider() {
  const provider = process.env.AI_PROVIDER ?? "openai";
  switch (provider) {
    case "openai":
      return new OpenAIEmbeddings({
        model: "text-embedding-ada-002",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    case "google":
      return new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`);
  }
}
```

**`src/lib/rag/providers/llm.ts`**

```ts
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export function createLLMProvider() {
  const provider = process.env.AI_PROVIDER ?? "openai";
  switch (provider) {
    case "openai":
      return openai("gpt-4o");
    case "google":
      return google("gemini-2.0-flash");
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`);
  }
}
```

### Modified files

| File | Change |
|---|---|
| `src/lib/rag/vectorstore.ts` | Remove inline `OpenAIEmbeddings`; call `createEmbeddingProvider()` |
| `src/app/api/chat/route.ts` | Remove `openai("gpt-4o")`; call `createLLMProvider()` |
| `src/lib/rag/index.ts` | Remove `embeddings` export; add `createEmbeddingProvider` export |

### Deleted files

| File | Reason |
|---|---|
| `src/lib/rag/embeddings.ts` | Replaced by `providers/embeddings.ts` |

### New test files

**`src/lib/rag/__tests__/providers/embeddings.test.ts`**
- `AI_PROVIDER=openai` → returns instance with `embedDocuments` and `embedQuery`
- `AI_PROVIDER=google` → returns instance with `embedDocuments` and `embedQuery`
- Unknown value → throws with readable message

**`src/lib/rag/__tests__/providers/llm.test.ts`**
- `AI_PROVIDER=openai` → returns a valid model object
- `AI_PROVIDER=google` → returns a valid model object
- Unknown value → throws with readable message

### Deleted test files

| File | Reason |
|---|---|
| `src/lib/rag/__tests__/embeddings.test.ts` | Module it tested no longer exists |

---

## Environment Variables

| Variable | Required for | Example |
|---|---|---|
| `AI_PROVIDER` | Both | `openai` (default) or `google` |
| `OPENAI_API_KEY` | OpenAI provider | `sk-...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google provider | `AIza...` |

---

## New Dependencies

| Package | Purpose |
|---|---|
| `@ai-sdk/google` | Gemini LLM via Vercel AI SDK |
| `@langchain/google-genai` | Google embeddings via LangChain |

---

## What Does Not Change

- RAG pipeline logic (`pipeline.ts`, `retrieval.ts`, `chunker.ts`)
- Prisma schema and DB layer
- Chat UI and Clerk auth
- Stripe/plans logic
- Scraper
- System prompt builder (`openai.ts`)

---

## Success Criteria

- `AI_PROVIDER=google pnpm ingest` runs ingestion using Google embeddings
- `AI_PROVIDER=google pnpm dev` serves chat responses from Gemini 2.0 Flash
- `AI_PROVIDER=openai pnpm dev` (or unset) behaves identically to today
- `AI_PROVIDER=bad` throws a clear error at call time
- All existing tests pass; new provider tests pass
