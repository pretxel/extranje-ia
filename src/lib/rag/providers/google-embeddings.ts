import { Embeddings } from "@langchain/core/embeddings";

const BASE_URL = "https://generativelanguage.googleapis.com/v1";
const MODEL = "text-embedding-004";

/**
 * LangChain-compatible embedding class that calls the Google Generative AI
 * v1 REST API directly. text-embedding-004 is only available on v1, not v1beta,
 * and the @langchain/google-genai SDK cannot override the API version.
 */
export class GoogleV1Embeddings extends Embeddings {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({});
    this.apiKey = apiKey;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const url = `${BASE_URL}/models/${MODEL}:batchEmbedContents?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Embeddings API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { embeddings: { values: number[] }[] };
    return data.embeddings.map((e) => e.values);
  }

  async embedQuery(text: string): Promise<number[]> {
    const url = `${BASE_URL}/models/${MODEL}:embedContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Embeddings API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }
}
