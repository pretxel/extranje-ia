import type { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkDocument(
  content: string,
  documentId: string,
  metadata: { source: string; url: string },
): Promise<Document[]> {
  if (!content.trim()) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 9000,
    chunkOverlap: 400,
  });

  return splitter.createDocuments([content], [{ documentId, ...metadata }]);
}
