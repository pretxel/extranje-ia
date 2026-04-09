import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleEmbeddings } from "./google-embeddings";

export function createEmbeddingProvider() {
  const provider = process.env.AI_PROVIDER ?? "openai";
  switch (provider) {
    case "openai":
      return new OpenAIEmbeddings({
        model: "text-embedding-ada-002",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    case "google":
      return new GoogleEmbeddings({ model: "text-embedding-004" });
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`);
  }
}
