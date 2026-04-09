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
