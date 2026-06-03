# LangChain + OpenAI RAG Chat Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vercel AI SDK `streamText` generation in `/api/chat` with a LangChain `ChatOpenAI` chain that consumes the existing LangChain RAG retriever, preserving streaming, source citations, plan limits, and auth.

**Architecture:** Retrieve-then-generate. Keep `findRelevantChunks()` for retrieval + Prisma-joined citation metadata. Build a `BaseMessage[]` (system from `buildSystemPrompt(context)` + mapped history + question) and pipe it through `ChatOpenAI(temperature:0, streaming:true) → StringOutputParser`. Bridge the resulting string token stream to the existing `useChat` UI by writing `source-url` then `text-start`/`text-delta`/`text-end` parts to a `createUIMessageStream` writer. Then delete the now-dead multi-provider chat abstraction.

**Tech Stack:** Next.js 16 App Router, `@langchain/openai` (`ChatOpenAI`), `@langchain/core` (messages, `StringOutputParser`, `Runnable`), Vercel AI SDK v6 UI message stream (`createUIMessageStream`), Vitest, Biome, pnpm.

**Why a `BaseMessage[]` instead of `ChatPromptTemplate`:** `ChatPromptTemplate` f-string-parses `{...}` in its templates. Retrieved BOE context can contain literal `{`/`}`, which would throw "Missing value for input variable". Passing pre-built `BaseMessage` objects avoids parsing untrusted text entirely. This is a deliberate refinement of the spec's prompt note; the LangChain `ChatOpenAI` generation chain is unchanged.

---

## File Structure

- **Create** `src/lib/rag/chain.ts` — pure helpers (`formatContext`, `extractMessageText`, `toLangChainHistory`, `buildMessages`) + `createChatModel()` + `buildRagChain()`. Single responsibility: turn RAG results + UI messages into a streamable LangChain chain + its inputs.
- **Create** `src/lib/rag/__tests__/chain.test.ts` — unit tests for the pure helpers and the model factory.
- **Modify** `src/app/api/chat/route.ts` — use the chain; drop `streamText`/`convertToModelMessages`/`createLLMProvider`.
- **Delete** `src/lib/rag/providers/llm.ts` and `src/lib/rag/__tests__/providers/llm.test.ts`.
- **Modify** `src/lib/rag/index.ts` — remove the `createLLMProvider` re-export.
- **Modify** `.env.example` — remove `AI_CHAT_PROVIDER`, anthropic/google chat model + `ANTHROPIC_API_KEY` lines.
- **Modify** `package.json` — remove unused `@ai-sdk/anthropic` + `@ai-sdk/google` deps.

> CLAUDE.md and README.md have unrelated uncommitted edits in the working tree — out of scope, do not touch them.

---

## Task 1: `chain.ts` — RAG generation chain + helpers (TDD)

**Files:**
- Create: `src/lib/rag/chain.ts`
- Test: `src/lib/rag/__tests__/chain.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/rag/__tests__/chain.test.ts`:

```ts
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import type { RAGResult } from "../types";
import {
  buildMessages,
  createChatModel,
  extractMessageText,
  formatContext,
  toLangChainHistory,
} from "../chain";

beforeAll(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

function ragResult(title: string, url: string, content: string): RAGResult {
  return {
    chunkId: "c",
    content,
    documentId: "d",
    similarity: 0.9,
    document: { title, url, source: "boe", verifiedAt: new Date("2026-01-01") },
  };
}

function uiMessage(role: "user" | "assistant", text: string): UIMessage {
  return { id: role + text, role, parts: [{ type: "text", text }] };
}

describe("formatContext", () => {
  it("formats chunks with source headers joined by a separator", () => {
    const { contextText, sources } = formatContext([
      ragResult("Doc A", "https://a", "body a"),
      ragResult("Doc B", "https://b", "body b"),
    ]);
    expect(contextText).toBe(
      "[Fuente: Doc A — https://a]\nbody a\n\n---\n\n[Fuente: Doc B — https://b]\nbody b",
    );
    expect(sources).toEqual([
      { url: "https://a", title: "Doc A" },
      { url: "https://b", title: "Doc B" },
    ]);
  });

  it("returns the fallback context and empty sources when there are no results", () => {
    const { contextText, sources } = formatContext([]);
    expect(contextText).toBe("No se encontró contexto relevante en las fuentes verificadas.");
    expect(sources).toEqual([]);
  });
});

describe("extractMessageText", () => {
  it("concatenates text parts and ignores non-text parts", () => {
    const message: UIMessage = {
      id: "m",
      role: "user",
      parts: [
        { type: "text", text: "parte 1 " },
        { type: "step-start" },
        { type: "text", text: "parte 2" },
      ],
    };
    expect(extractMessageText(message)).toBe("parte 1 parte 2");
  });
});

describe("toLangChainHistory", () => {
  it("maps user/assistant text messages to LangChain messages in order", () => {
    const history = toLangChainHistory([uiMessage("user", "hola"), uiMessage("assistant", "buenas")]);
    expect(history).toHaveLength(2);
    expect(history[0]).toBeInstanceOf(HumanMessage);
    expect(history[0].content).toBe("hola");
    expect(history[1]).toBeInstanceOf(AIMessage);
    expect(history[1].content).toBe("buenas");
  });

  it("drops messages that have no text", () => {
    const empty: UIMessage = { id: "e", role: "assistant", parts: [{ type: "step-start" }] };
    expect(toLangChainHistory([empty])).toEqual([]);
  });
});

describe("buildMessages", () => {
  it("places the system prompt first, history in the middle, question last", () => {
    const history = [new HumanMessage("previa")];
    const messages = buildMessages({ system: "SYS", history, question: "¿cómo renuevo el TIE?" });
    expect(messages).toHaveLength(3);
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    expect(messages[0].content).toBe("SYS");
    expect(messages[1]).toBe(history[0]);
    expect(messages[2]).toBeInstanceOf(HumanMessage);
    expect(messages[2].content).toBe("¿cómo renuevo el TIE?");
  });
});

describe("createChatModel", () => {
  it("returns a ChatOpenAI with temperature 0, streaming, default model gpt-4o", () => {
    delete process.env.OPENAI_CHAT_MODEL;
    const model = createChatModel();
    expect(model).toBeInstanceOf(ChatOpenAI);
    expect(model.temperature).toBe(0);
    expect(model.streaming).toBe(true);
    expect(model.model).toBe("gpt-4o");
  });

  it("honours the OPENAI_CHAT_MODEL override", () => {
    process.env.OPENAI_CHAT_MODEL = "gpt-4o-mini";
    const model = createChatModel();
    expect(model.model).toBe("gpt-4o-mini");
    delete process.env.OPENAI_CHAT_MODEL;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/rag/__tests__/chain.test.ts`
Expected: FAIL — `Failed to resolve import "../chain"` / module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/rag/chain.ts`:

```ts
import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { Runnable } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import type { UIMessage } from "ai";
import type { RAGResult } from "./types";

const NO_CONTEXT = "No se encontró contexto relevante en las fuentes verificadas.";

export interface ChatSource {
  url: string;
  title: string;
}

export function formatContext(ragResults: RAGResult[]): {
  contextText: string;
  sources: ChatSource[];
} {
  if (ragResults.length === 0) {
    return { contextText: NO_CONTEXT, sources: [] };
  }
  const contextText = ragResults
    .map((r) => `[Fuente: ${r.document.title} — ${r.document.url}]\n${r.content}`)
    .join("\n\n---\n\n");
  const sources = ragResults.map((r) => ({ url: r.document.url, title: r.document.title }));
  return { contextText, sources };
}

export function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function toLangChainHistory(messages: UIMessage[]): BaseMessage[] {
  return messages.flatMap((m) => {
    const text = extractMessageText(m);
    if (!text) return [];
    if (m.role === "user") return [new HumanMessage(text)];
    if (m.role === "assistant") return [new AIMessage(text)];
    return [];
  });
}

export function buildMessages({
  system,
  history,
  question,
}: {
  system: string;
  history: BaseMessage[];
  question: string;
}): BaseMessage[] {
  return [new SystemMessage(system), ...history, new HumanMessage(question)];
}

export function createChatModel(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o",
    temperature: 0,
    streaming: true,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function buildRagChain(): Runnable<BaseMessage[], string> {
  return createChatModel().pipe(new StringOutputParser());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/rag/__tests__/chain.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/chain.ts src/lib/rag/__tests__/chain.test.ts
git commit -m "feat: add LangChain ChatOpenAI RAG generation chain

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Rewrite `/api/chat` route to stream via the LangChain chain

**Files:**
- Modify: `src/app/api/chat/route.ts` (full rewrite)

> Not unit-tested (route streaming is verified manually). Build + lint are the gates here; full manual check happens in Task 5.

- [ ] **Step 1: Replace the route file**

Overwrite `src/app/api/chat/route.ts` with:

```ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/openai";
import type { Plan } from "@/lib/plans";
import { hasReachedLimit } from "@/lib/plans";
import { findRelevantChunks } from "@/lib/rag";
import {
  buildMessages,
  buildRagChain,
  extractMessageText,
  formatContext,
  toLangChainHistory,
} from "@/lib/rag/chain";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Find or create user and check usage limits
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

  // Last user message drives RAG retrieval; everything before it is chat history.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const queryText = lastUserMessage ? extractMessageText(lastUserMessage) : "";

  const ragResults = queryText ? await findRelevantChunks(queryText, 5) : [];
  const { contextText, sources } = formatContext(ragResults);
  const history = toLangChainHistory(messages.filter((m) => m !== lastUserMessage));
  const systemPrompt = buildSystemPrompt(contextText);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      for (const source of sources) {
        writer.write({
          type: "source-url",
          sourceId: source.url,
          url: source.url,
          title: source.title,
        });
      }

      const id = "msg-text";
      writer.write({ type: "text-start", id });
      const llmStream = await buildRagChain().stream(
        buildMessages({ system: systemPrompt, history, question: queryText }),
      );
      for await (const chunk of llmStream) {
        if (chunk) writer.write({ type: "text-delta", id, delta: chunk });
      }
      writer.write({ type: "text-end", id });
    },
    onError: (error) =>
      error instanceof Error ? error.message : "Error generando la respuesta.",
    onFinish: async () => {
      await prisma.user.update({
        where: { clerkId: userId },
        data: { queriesUsed: { increment: 1 } },
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

- [ ] **Step 2: Verify the route type-checks and lints**

Run: `pnpm lint:biome`
Expected: no errors for `src/app/api/chat/route.ts` (no unused imports — `streamText`, `convertToModelMessages`, `createLLMProvider` are gone).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: stream chat answers through the LangChain RAG chain

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Remove the dead multi-provider chat abstraction

**Files:**
- Delete: `src/lib/rag/providers/llm.ts`
- Delete: `src/lib/rag/__tests__/providers/llm.test.ts`
- Modify: `src/lib/rag/index.ts:4`
- Modify: `.env.example`

- [ ] **Step 1: Delete the dead files**

```bash
git rm src/lib/rag/providers/llm.ts src/lib/rag/__tests__/providers/llm.test.ts
```

- [ ] **Step 2: Remove the re-export from the barrel**

In `src/lib/rag/index.ts`, delete this line:

```ts
export { createLLMProvider } from "./providers/llm";
```

The remaining file is:

```ts
export { chunkDocument } from "./chunker";
export { runIngestion } from "./pipeline";
export { createEmbeddingProvider } from "./providers/embeddings";
export { findRelevantChunks } from "./retrieval";
export type { RAGResult, ScrapedDocument } from "./types";
```

- [ ] **Step 3: Prune `.env.example`**

Remove the chat-provider line. Replace:

```
# Chat provider: "openai" (default) | "anthropic" | "google"
AI_CHAT_PROVIDER=openai

# Embedding provider: "openai" (default) | "google"
```

with:

```
# Embedding provider: "openai" (default) | "google"
```

Remove the dead model overrides. Replace:

```
# Optional model overrides
# OPENAI_CHAT_MODEL=gpt-4o
# ANTHROPIC_CHAT_MODEL=claude-sonnet-4-6
# GOOGLE_CHAT_MODEL=gemini-2.0-flash
# OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

with:

```
# Optional model overrides
# OPENAI_CHAT_MODEL=gpt-4o
# OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

Remove the anthropic key block. Replace:

```
# Required when AI_CHAT_PROVIDER=anthropic
ANTHROPIC_API_KEY=

# Required when Google used for chat or embeddings
GOOGLE_GENERATIVE_AI_API_KEY=
```

with:

```
# Required when Google used for embeddings
GOOGLE_GENERATIVE_AI_API_KEY=
```

- [ ] **Step 4: Verify nothing still references the removed symbols**

Run: `grep -rn "createLLMProvider\|getChatProvider\|AI_CHAT_PROVIDER" src/`
Expected: no output.

- [ ] **Step 5: Run the full test suite + lint**

Run: `pnpm vitest run && pnpm lint:biome`
Expected: PASS — `chain.test.ts` green, no leftover reference to the deleted `llm.test.ts`, Biome clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove dead multi-provider chat abstraction

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Drop unused `@ai-sdk/anthropic` and `@ai-sdk/google` dependencies

**Files:**
- Modify: `package.json`

> Verified: these packages were imported only by the now-deleted `providers/llm.ts` and its test. The agent route uses its own OpenAI-locked `agentChatModel`.

- [ ] **Step 1: Confirm there are no importers left**

Run: `grep -rn "@ai-sdk/anthropic\|@ai-sdk/google" src/`
Expected: no output.

- [ ] **Step 2: Remove the two dependency lines from `package.json`**

Delete these lines from `dependencies`:

```
    "@ai-sdk/anthropic": "^3.0.71",
    "@ai-sdk/google": "^3.0.60",
```

(Leave `@ai-sdk/openai`, `@ai-sdk/react`, `@langchain/google-genai` — the last still backs Google embeddings.)

- [ ] **Step 3: Update the lockfile**

Run: `pnpm install`
Expected: lockfile updates, removing the two packages; install succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: drop unused @ai-sdk/anthropic and @ai-sdk/google deps

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full unit suite + lint**

Run: `pnpm vitest run && pnpm lint:biome`
Expected: all tests PASS, Biome clean.

- [ ] **Step 2: Production build (type check)**

Run: `pnpm build`
Expected: build succeeds (Next.js type-checks the rewritten route). Requires `DATABASE_URL` in `.env.local` for `prisma generate`; if the build cannot run in this environment, note it and rely on `pnpm lint:biome` + Vitest.

- [ ] **Step 3: Manual smoke test (if a dev environment is available)**

Run: `pnpm dev`, sign in, send a chat query (e.g. "¿Cómo renuevo el TIE?").
Expected: answer streams token-by-token; source chips render; a follow-up question retains context (multi-turn); `queriesUsed` increments by 1 per query.

---

## Self-Review

**Spec coverage:**
- Retrieve-then-generate, reuse `findRelevantChunks` → Task 2. ✅
- `createChatModel` / `buildRagChain` / `toLangChainHistory` / `formatContext` → Task 1. ✅
- `buildSystemPrompt` reuse → Task 2. ✅
- Manual `text-start`/`text-delta`/`text-end` + `source-url` bridge → Task 2. ✅
- Multi-turn history + streaming preserved → Task 1 (`toLangChainHistory`) + Task 2. ✅
- temperature 0 → Task 1 (`createChatModel`). ✅
- Remove `providers/llm.ts` + test + barrel export + env → Task 3. ✅
- Conditional dep removal (now definite — no importers) → Task 4. ✅
- Error handling (no context fallback, OpenAI key, stream error via `onError`) → Task 1/2. ✅
- Tests for `formatContext`, `toLangChainHistory`, `createChatModel` → Task 1. ✅

**Placeholder scan:** No TBD/TODO; every code/edit step shows full content.

**Type consistency:** `extractMessageText`, `toLangChainHistory`, `buildMessages`, `formatContext`, `createChatModel`, `buildRagChain` named identically across Task 1 (definition), its test, and Task 2 (route import). `ChatSource` shape `{ url, title }` matches the `source-url` part fields written in Task 2.
