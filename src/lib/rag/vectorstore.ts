import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-ada-002",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function getVectorStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "rag_vectors",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    distanceStrategy: "cosine" as const,
  });
}
