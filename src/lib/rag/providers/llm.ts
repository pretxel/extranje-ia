import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export type ChatProvider = "openai" | "anthropic" | "google";

export function getChatProvider(): ChatProvider {
  const provider = (process.env.AI_CHAT_PROVIDER ?? "openai") as ChatProvider;
  if (provider !== "openai" && provider !== "anthropic" && provider !== "google") {
    throw new Error(
      `Unknown AI_CHAT_PROVIDER: "${provider}". Valid values: "openai", "anthropic", "google"`,
    );
  }
  return provider;
}

export function createLLMProvider() {
  switch (getChatProvider()) {
    case "openai":
      return openai(process.env.OPENAI_CHAT_MODEL ?? "gpt-4o");
    case "anthropic":
      return anthropic(process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-6");
    case "google":
      return google(process.env.GOOGLE_CHAT_MODEL ?? "gemini-2.0-flash");
  }
}
