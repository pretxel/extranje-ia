# Provider Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple embeddings and LLM from hardcoded OpenAI by introducing two factory functions controlled by a single `AI_PROVIDER` env var, adding Google (Gemini 2.0 Flash + text-embedding-004) as a free alternative.

**Architecture:** Two factory functions (`createEmbeddingProvider`, `createLLMProvider`) live under `src/lib/rag/providers/`. Each reads `process.env.AI_PROVIDER` and returns the appropriate LangChain embeddings instance or Vercel AI SDK model. Callers (`vectorstore.ts`, `route.ts`) are updated to use the factories. The old `embeddings.ts` singleton is deleted.

**Tech Stack:** TypeScript, LangChain (`@langchain/openai`, `@langchain/google-genai`), Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/google`), Vitest.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/rag/providers/embeddings.ts` | `createEmbeddingProvider()` factory |
| Create | `src/lib/rag/providers/llm.ts` | `createLLMProvider()` factory |
| Create | `src/lib/rag/__tests__/providers/embeddings.test.ts` | Tests for embedding factory |
| Create | `src/lib/rag/__tests__/providers/llm.test.ts` | Tests for LLM factory |
| Modify | `src/lib/rag/vectorstore.ts` | Use `createEmbeddingProvider()` |
| Modify | `src/app/api/chat/route.ts` | Use `createLLMProvider()` |
| Modify | `src/lib/rag/index.ts` | Update exports |
| Delete | `src/lib/rag/embeddings.ts` | Replaced by providers/ |
| Delete | `src/lib/rag/__tests__/embeddings.test.ts` | Module no longer exists |

---

## Task 1: Install new dependencies

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Add packages**

```bash
pnpm add @ai-sdk/google @langchain/google-genai
```

Expected output: both packages appear under `dependencies` in `package.json`.

- [ ] **Step 2: Verify install**

```bash
pnpm ls @ai-sdk/google @langchain/google-genai
```

Expected: both listed with version numbers, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @ai-sdk/google and @langchain/google-genai"
```

---

## Task 2: Create embedding provider factory (TDD)

**Files:**
- Create: `src/lib/rag/__tests__/providers/embeddings.test.ts`
- Create: `src/lib/rag/providers/embeddings.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/rag/__tests__/providers/embeddings.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpenAIInstance, mockGoogleInstance } = vi.hoisted(() => ({
  mockOpenAIInstance: {
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  },
  mockGoogleInstance: {
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  },
}));

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => mockOpenAIInstance),
}));

vi.mock("@langchain/google-genai", () => ({
  GoogleGenerativeAIEmbeddings: vi.fn().mockImplementation(() => mockGoogleInstance),
}));

import { createEmbeddingProvider } from "../../providers/embeddings";

describe("createEmbeddingProvider", () => {
  const originalEnv = process.env.AI_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalEnv;
    }
  });

  it("returns OpenAI embeddings when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("returns OpenAI embeddings when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
  });

  it("returns Google embeddings when AI_PROVIDER=google", () => {
    process.env.AI_PROVIDER = "google";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockGoogleInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_PROVIDER = "cohere";
    expect(() => createEmbeddingProvider()).toThrowError(
      'Unknown AI_PROVIDER: "cohere". Valid values: "openai", "google"'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/rag/__tests__/providers/embeddings.test.ts
```

Expected: FAIL with `Cannot find module '../../providers/embeddings'`.

- [ ] **Step 3: Create the factory**

Create `src/lib/rag/providers/embeddings.ts`:

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
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`
      );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/rag/__tests__/providers/embeddings.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/providers/embeddings.ts src/lib/rag/__tests__/providers/embeddings.test.ts
git commit -m "feat: add createEmbeddingProvider factory (openai + google)"
```

---

## Task 3: Create LLM provider factory (TDD)

**Files:**
- Create: `src/lib/rag/__tests__/providers/llm.test.ts`
- Create: `src/lib/rag/providers/llm.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/rag/__tests__/providers/llm.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const mockOpenAIModel = { provider: "openai", modelId: "gpt-4o" };
const mockGoogleModel = { provider: "google", modelId: "gemini-2.0-flash" };

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockImplementation(() => mockOpenAIModel),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockImplementation(() => mockGoogleModel),
}));

import { createLLMProvider } from "../../providers/llm";

describe("createLLMProvider", () => {
  const originalEnv = process.env.AI_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalEnv;
    }
  });

  it("returns OpenAI model when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
  });

  it("returns OpenAI model when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
  });

  it("returns Google model when AI_PROVIDER=google", () => {
    process.env.AI_PROVIDER = "google";
    const model = createLLMProvider();
    expect(model).toBe(mockGoogleModel);
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_PROVIDER = "cohere";
    expect(() => createLLMProvider()).toThrowError(
      'Unknown AI_PROVIDER: "cohere". Valid values: "openai", "google"'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/rag/__tests__/providers/llm.test.ts
```

Expected: FAIL with `Cannot find module '../../providers/llm'`.

- [ ] **Step 3: Create the factory**

Create `src/lib/rag/providers/llm.ts`:

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
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`
      );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/rag/__tests__/providers/llm.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/providers/llm.ts src/lib/rag/__tests__/providers/llm.test.ts
git commit -m "feat: add createLLMProvider factory (openai + google)"
```

---

## Task 4: Update vectorstore to use the embedding factory

**Files:**
- Modify: `src/lib/rag/vectorstore.ts`

Current content of `src/lib/rag/vectorstore.ts`:

```ts
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-ada-002",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function getVectorStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "rag_vectors",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    distanceStrategy: "cosine" as const,
  });
}
```

- [ ] **Step 1: Replace the file content**

Replace `src/lib/rag/vectorstore.ts` with:

```ts
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Pool } from "pg";
import { createEmbeddingProvider } from "./providers/embeddings";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getVectorStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(createEmbeddingProvider(), {
    pool,
    tableName: "rag_vectors",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    distanceStrategy: "cosine" as const,
  });
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
pnpm vitest run
```

Expected: all tests PASS (chunker, providers/embeddings, providers/llm, claude).

- [ ] **Step 3: Commit**

```bash
git add src/lib/rag/vectorstore.ts
git commit -m "refactor: vectorstore uses createEmbeddingProvider instead of hardcoded OpenAI"
```

---

## Task 5: Update chat route to use the LLM factory

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Replace the hardcoded model**

In `src/app/api/chat/route.ts`, make these two changes:

Remove this import:
```ts
import { openai } from "@ai-sdk/openai";
```

Add this import after the existing imports:
```ts
import { createLLMProvider } from "@/lib/rag/providers/llm";
```

Replace this line inside the `POST` function:
```ts
    model: openai("gpt-4o"),
```

With:
```ts
    model: createLLMProvider(),
```

The full updated file should be:

```ts
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/openai";
import type { Plan } from "@/lib/plans";
import { hasReachedLimit } from "@/lib/plans";
import { createLLMProvider } from "@/lib/rag/providers/llm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@pending.local`;
    user = await prisma.user.create({
      data: { clerkId: userId, email, plan: "free", queriesUsed: 0 },
    });
  }

  if (hasReachedLimit(user.plan as Plan, user.queriesUsed)) {
    return new Response(JSON.stringify({ error: "limit_reached", plan: user.plan }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  // TODO: get last user message text and call findRelevantChunks(lastMessage, 5)
  const contextText = "Contexto de extranjería española. [Pendiente de integrar RAG]";
  const sources: Array<{ url: string; title: string }> = []; // TODO: from RAG results

  const result = streamText({
    model: createLLMProvider(),
    system: buildSystemPrompt(contextText),
    messages: await convertToModelMessages(messages),

    onFinish: async () => {
      await prisma.user.update({
        where: { clerkId: userId },
        data: { queriesUsed: { increment: 1 } },
      });
    },
  });

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      for (const source of sources) {
        writer.write({
          type: "source-url",
          sourceId: source.url,
          url: source.url,
          title: source.title,
        });
      }
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: chat route uses createLLMProvider instead of hardcoded openai"
```

---

## Task 6: Update exports and delete old files

**Files:**
- Modify: `src/lib/rag/index.ts`
- Delete: `src/lib/rag/embeddings.ts`
- Delete: `src/lib/rag/__tests__/embeddings.test.ts`

- [ ] **Step 1: Update index.ts**

Replace the contents of `src/lib/rag/index.ts` with:

```ts
export { chunkDocument } from "./chunker";
export { createEmbeddingProvider } from "./providers/embeddings";
export { createLLMProvider } from "./providers/llm";
export { runIngestion } from "./pipeline";
export { findRelevantChunks } from "./retrieval";
export type { RAGResult, ScrapedDocument } from "./types";
```

- [ ] **Step 2: Delete old files**

```bash
rm src/lib/rag/embeddings.ts
rm src/lib/rag/__tests__/embeddings.test.ts
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm vitest run
```

Expected: all tests PASS. The old `embeddings.test.ts` tests are gone; the new provider tests cover the same ground.

- [ ] **Step 4: Run linter**

```bash
pnpm lint:biome
```

Expected: no errors. If there are formatting issues, run `pnpm lint:fix`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/index.ts
git rm src/lib/rag/embeddings.ts src/lib/rag/__tests__/embeddings.test.ts
git commit -m "chore: remove old embeddings singleton, update rag exports"
```

---

## Task 7: Verify end-to-end with Google provider

**Files:** none (smoke test only)

- [ ] **Step 1: Add Google API key to local env**

In `.env.local`, add:

```
GOOGLE_GENERATIVE_AI_API_KEY=<your-key-from-aistudio.google.com>
AI_PROVIDER=google
```

- [ ] **Step 2: Start dev server with Google provider**

```bash
AI_PROVIDER=google pnpm dev
```

Expected: server starts without errors, no mention of OpenAI in startup logs.

- [ ] **Step 3: Verify chat responds**

Open `http://localhost:3000`, send a message, confirm a response arrives (it will use the placeholder context until RAG is wired up, but the model call itself should succeed).

- [ ] **Step 4: Restore default for dev**

In `.env.local`, remove or comment out `AI_PROVIDER=google` to restore OpenAI as default for day-to-day development.

- [ ] **Step 5: Verify OpenAI still works**

```bash
pnpm dev
```

Expected: server starts, chat responds as before.
