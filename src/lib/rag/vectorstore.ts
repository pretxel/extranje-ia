import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Pool } from "pg";
import { createEmbeddingProvider } from "./providers/embeddings";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getVectorStore(): Promise<PGVectorStore> {
  return PGVectorStore.initialize(createEmbeddingProvider(), {
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
