import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { Runnable } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { isTextUIPart, type UIMessage } from "ai";
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
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");
}

export function toLangChainHistory(messages: UIMessage[]): BaseMessage[] {
  return messages.flatMap((m) => {
    const text = extractMessageText(m);
    if (!text) return [];
    if (m.role === "user") return [new HumanMessage(text)];
    if (m.role === "assistant") return [new AIMessage(text)];
    // Drop system-role (and any non-user/assistant) messages: the system prompt
    // is supplied separately via buildMessages.
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
