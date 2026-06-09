import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildMessages,
  buildRagChain,
  createChatModel,
  extractMessageText,
  formatContext,
  toLangChainHistory,
} from "../chain";
import type { RAGResult } from "../types";

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
    const history = toLangChainHistory([
      uiMessage("user", "hola"),
      uiMessage("assistant", "buenas"),
    ]);
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
  it("returns a ChatOpenAI with temperature 0, streaming, default model gpt-4o-mini", () => {
    delete process.env.OPENAI_CHAT_MODEL;
    const model = createChatModel();
    expect(model).toBeInstanceOf(ChatOpenAI);
    expect(model.temperature).toBe(0);
    expect(model.streaming).toBe(true);
    expect(model.model).toBe("gpt-4o-mini");
  });

  it("honours the OPENAI_CHAT_MODEL override", () => {
    process.env.OPENAI_CHAT_MODEL = "gpt-4o";
    const model = createChatModel();
    expect(model.model).toBe("gpt-4o");
    delete process.env.OPENAI_CHAT_MODEL;
  });
});

describe("buildRagChain", () => {
  it("returns a Runnable sequence", () => {
    expect(buildRagChain()).toBeInstanceOf(RunnableSequence);
  });
});
