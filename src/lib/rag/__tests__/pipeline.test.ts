import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scrapeAllMock = vi.hoisted(() => vi.fn());
const docFindUniqueMock = vi.hoisted(() => vi.fn());
const docUpdateMock = vi.hoisted(() => vi.fn());
const docCreateMock = vi.hoisted(() => vi.fn());
const chunkDeleteManyMock = vi.hoisted(() => vi.fn());
const executeRawMock = vi.hoisted(() => vi.fn());
const addDocumentsMock = vi.hoisted(() => vi.fn());
const chunkDocumentMock = vi.hoisted(() => vi.fn().mockResolvedValue([{ pageContent: "x" }]));
const getVectorStoreMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ addDocuments: addDocumentsMock }),
);

vi.mock("@/lib/scraper", () => ({ scrapeAll: scrapeAllMock }));
vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      findUnique: docFindUniqueMock,
      update: docUpdateMock,
      create: docCreateMock,
    },
    chunk: { deleteMany: chunkDeleteManyMock },
    $executeRawUnsafe: executeRawMock,
  },
}));
vi.mock("../chunker", () => ({ chunkDocument: chunkDocumentMock }));
vi.mock("../vectorstore", () => ({ getVectorStore: getVectorStoreMock }));

import { runIngestion } from "../pipeline";

const SCRAPED = {
  url: "https://boe.es/x",
  title: "T",
  source: "boe" as const,
  content: "hola mundo",
  scrapedAt: new Date(),
};

describe("runIngestion", () => {
  beforeEach(() => {
    scrapeAllMock.mockReset();
    docFindUniqueMock.mockReset();
    docUpdateMock.mockReset();
    docCreateMock.mockReset();
    chunkDeleteManyMock.mockReset();
    executeRawMock.mockReset();
    addDocumentsMock.mockReset();
    addDocumentsMock.mockResolvedValue(undefined);
    executeRawMock.mockResolvedValue(0);
    chunkDeleteManyMock.mockResolvedValue({ count: 0 });
  });

  it("inserts a brand-new document", async () => {
    scrapeAllMock.mockResolvedValue([SCRAPED]);
    docFindUniqueMock.mockResolvedValue(null);
    docCreateMock.mockResolvedValue({ id: "d1" });

    const result = await runIngestion();

    expect(docCreateMock).toHaveBeenCalledOnce();
    expect(docUpdateMock).not.toHaveBeenCalled();
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
  });

  it("skips writes when content hash is unchanged", async () => {
    scrapeAllMock.mockResolvedValue([SCRAPED]);
    const sameHash = createHash("sha256").update(SCRAPED.content).digest("hex");
    docFindUniqueMock.mockResolvedValue({ id: "d1", contentHash: sameHash });

    const result = await runIngestion();

    expect(docCreateMock).not.toHaveBeenCalled();
    expect(docUpdateMock).not.toHaveBeenCalled();
    expect(addDocumentsMock).not.toHaveBeenCalled();
    expect(result.unchanged).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("updates + re-embeds when content hash differs", async () => {
    scrapeAllMock.mockResolvedValue([SCRAPED]);
    docFindUniqueMock.mockResolvedValue({ id: "d1", contentHash: "stale" });
    docUpdateMock.mockResolvedValue({ id: "d1" });

    const result = await runIngestion();

    expect(docUpdateMock).toHaveBeenCalledOnce();
    expect(executeRawMock).toHaveBeenCalled(); // delete vectors
    expect(chunkDeleteManyMock).toHaveBeenCalledWith({ where: { documentId: "d1" } });
    expect(addDocumentsMock).toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });
});
