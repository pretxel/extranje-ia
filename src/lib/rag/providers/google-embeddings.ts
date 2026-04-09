import { google } from "@ai-sdk/google";
import { Embeddings } from "@langchain/core/embeddings";
import { embed, embedMany } from "ai";

export class GoogleEmbeddings extends Embeddings {
  private readonly modelName: string;

  constructor(fields?: { model?: string }) {
    super({});
    this.modelName = fields?.model ?? "text-embedding-004";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel(this.modelName),
      values: texts,
    });
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(this.modelName),
      value: text,
    });
    return embedding;
  }
}
