import { Embeddings } from "@langchain/core/embeddings";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "embedding-001";

/**
 * LangChain-compatible embedding class that calls the Google Generative AI
 * v1beta REST API directly.
 *
 * text-embedding-004 is not universally available (depends on API key type /
 * billing). embedding-001 is the stable fallback available to all AI Studio keys.
 * Both produce 768-dimensional vectors.
 *
 * NOTE: Switching from OpenAI (1536-dim) requires dropping and recreating the
 * rag_vectors table so PGVectorStore recreates it at 768 dimensions.
 */
export class GoogleEmbeddings extends Embeddings {
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
