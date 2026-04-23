import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleEmbeddings } from "./google-embeddings";

export type EmbeddingProvider = "openai" | "google";

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.AI_EMBEDDING_PROVIDER ?? "openai") as EmbeddingProvider;
  if (provider !== "openai" && provider !== "google") {
    throw new Error(
      `Unknown AI_EMBEDDING_PROVIDER: "${provider}". Valid values: "openai", "google"`,
    );
  }
  return provider;
}

// OpenAI text-embedding-ada-002 → 1536 dims; Google embedding-001 → 768 dims
export function getEmbeddingDimensions(): number {
  return getEmbeddingProvider() === "google" ? 768 : 1536;
}

export function createEmbeddingProvider() {
  switch (getEmbeddingProvider()) {
    case "openai":
      return new OpenAIEmbeddings({
        model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-ada-002",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    case "google": {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
      return new GoogleEmbeddings(apiKey);
    }
  }
}
