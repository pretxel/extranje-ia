import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Embeddings } from "@langchain/core/embeddings";
import { embed, embedMany } from "ai";

// @ai-sdk/google defaults to v1beta, but text-embedding-004 requires v1
const googleV1 = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1",
});

export class GoogleEmbeddings extends Embeddings {
  private readonly modelName: string;

  constructor(fields?: { model?: string }) {
    super({});
    this.modelName = fields?.model ?? "text-embedding-004";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: googleV1.textEmbeddingModel(this.modelName),
      values: texts,
    });
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: googleV1.textEmbeddingModel(this.modelName),
      value: text,
    });
    return embedding;
  }
}
