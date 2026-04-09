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
    case "google": {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
      return new GoogleEmbeddings(apiKey);
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`);
  }
}
