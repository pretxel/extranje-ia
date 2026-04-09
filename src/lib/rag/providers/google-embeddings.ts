import { GoogleGenerativeAI } from "@google/generative-ai";
import { Embeddings } from "@langchain/core/embeddings";

export class GoogleEmbeddings extends Embeddings {
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(fields?: { apiKey?: string; model?: string }) {
    super({});
    this.client = new GoogleGenerativeAI(
      fields?.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
    );
    this.modelName = fields?.model ?? "text-embedding-004";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const results = await Promise.all(texts.map((text) => model.embedContent(text)));
    return results.map((r) => r.embedding.values);
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
