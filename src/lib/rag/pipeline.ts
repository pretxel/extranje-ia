import { prisma } from "@/lib/db";
import { scrapeAll } from "@/lib/scraper";
import { chunkDocument } from "./chunker";
import { getVectorStore } from "./vectorstore";

export async function runIngestion(): Promise<{ scraped: number; chunked: number }> {
  console.log("[ingest] Scraping documents...");
  const scraped = await scrapeAll();
  console.log(`[ingest] Scraped ${scraped.length} documents`);

  let chunked = 0;
  const vectorStore = await getVectorStore();

  for (const doc of scraped) {
    const existing = await prisma.document.findUnique({ where: { url: doc.url } });
    if (existing) {
      console.log(`[ingest] Skipping existing: ${doc.url}`);
      continue;
    }

    const inserted = await prisma.document.create({
      data: {
        url: doc.url,
        title: doc.title,
        source: doc.source,
        content: doc.content,
      },
    });

    const chunks = await chunkDocument(doc.content, inserted.id, {
      source: doc.source,
      url: doc.url,
    });
    chunked += chunks.length;

    console.log(`[ingest] Chunked ${chunks.length} chunks for ${doc.title}`);

    await vectorStore.addDocuments(chunks);
    console.log(`[ingest] Processed: ${doc.title} (${chunks.length} chunks)`);
  }

  console.log(`[ingest] Done — ${chunked} chunks from ${scraped.length} documents`);
  return { scraped: scraped.length, chunked };
}
