export interface ScrapedDocument {
  url: string;
  title: string;
  content: string;
  source: "boe" | "sede" | "sepe";
  scrapedAt: Date;
}

export interface RAGResult {
  chunkId: string;
  content: string;
  documentId: string;
  similarity: number;
  document: {
    title: string;
    url: string;
    source: "boe" | "sede" | "sepe";
    verifiedAt: Date;
  };
}
