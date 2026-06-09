import { openai } from "@ai-sdk/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is required for the agent route. /api/agent is OpenAI-locked and ignores AI_EMBEDDING_PROVIDER.",
    );
  }
  return key;
}

export function agentChatModel() {
  requireOpenAIKey();
  return openai(process.env.OPENAI_AGENT_MODEL ?? "gpt-4o-mini");
}

export function agentEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    model: process.env.OPENAI_AGENT_EMBEDDING_MODEL ?? "text-embedding-3-small",
    openAIApiKey: requireOpenAIKey(),
  });
}
