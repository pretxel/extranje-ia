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
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid values: "openai", "google"`);
  }
}
