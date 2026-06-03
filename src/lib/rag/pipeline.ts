import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { scrapeAll } from "@/lib/scraper";
import { chunkDocument } from "./chunker";
import { getVectorStore } from "./vectorstore";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

async function deleteVectorsForDocument(documentId: string): Promise<void> {
  // Vectors live in the LangChain-managed `rag_vectors` table; the documentId
  // is stored inside the JSON `metadata` column.
  await prisma.$executeRawUnsafe(
    `DELETE FROM rag_vectors WHERE metadata->>'documentId' = $1`,
    documentId,
  );
}

export async function runIngestion(): Promise<{
  scraped: number;
  inserted: number;
  updated: number;
  unchanged: number;
  chunked: number;
}> {
  console.log("[ingest] Scraping documents...");
  const scraped = await scrapeAll();
  console.log(`[ingest] Scraped ${scraped.length} documents`);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let chunked = 0;
  const vectorStore = await getVectorStore();

  for (const doc of scraped) {
    const hash = sha256(doc.content);
    const existing = await prisma.document.findUnique({
      where: { url: doc.url },
      select: { id: true, contentHash: true },
    });

    if (existing && existing.contentHash === hash) {
      unchanged += 1;
      console.log(`[ingest] Unchanged: ${doc.url}`);
      continue;
    }

    let documentId: string;
    if (existing) {
      const row = await prisma.document.update({
        where: { url: doc.url },
        data: {
          title: doc.title,
          source: doc.source,
          content: doc.content,
          contentHash: hash,
        },
        select: { id: true },
      });
      documentId = row.id;
      await deleteVectorsForDocument(documentId);
      await prisma.chunk.deleteMany({ where: { documentId } });
      updated += 1;
      console.log(`[ingest] Updated: ${doc.url}`);
    } else {
      const row = await prisma.document.create({
        data: {
          url: doc.url,
          title: doc.title,
          source: doc.source,
          content: doc.content,
          contentHash: hash,
        },
        select: { id: true },
      });
      documentId = row.id;
      inserted += 1;
      console.log(`[ingest] Inserted: ${doc.url}`);
    }

    const chunks = await chunkDocument(doc.content, documentId, {
      source: doc.source,
      url: doc.url,
    });
    chunked += chunks.length;
    await vectorStore.addDocuments(chunks);
    console.log(`[ingest] Embedded ${chunks.length} chunks for ${doc.title}`);
  }

  console.log(
    `[ingest] Done — inserted=${inserted} updated=${updated} unchanged=${unchanged} chunks=${chunked}`,
  );
  return { scraped: scraped.length, inserted, updated, unchanged, chunked };
}
