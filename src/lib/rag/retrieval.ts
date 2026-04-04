import { prisma } from "@/lib/db";
import type { RAGResult } from "./types";
import { getVectorStore } from "./vectorstore";

export async function findRelevantChunks(query: string, limit = 5): Promise<RAGResult[]> {
  const vectorStore = await getVectorStore();
  const results = await vectorStore.similaritySearchWithScore(query, limit);

  const docIds = [...new Set(results.map(([doc]) => doc.metadata.documentId as string))];
  const documents = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, title: true, url: true, source: true, verifiedAt: true },
  });
  const docMap = new Map(documents.map((d) => [d.id, d]));

  return results.flatMap(([doc, score]) => {
    const document = docMap.get(doc.metadata.documentId as string);
    if (!document) return [];
    return [
      {
        chunkId: doc.id ?? "",
        content: doc.pageContent,
        documentId: doc.metadata.documentId as string,
        similarity: score,
        document: {
          title: document.title,
          url: document.url,
          source: document.source as "boe" | "sede" | "sepe",
          verifiedAt: document.verifiedAt,
        },
      },
    ];
  });
}
