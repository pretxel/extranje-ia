import { beforeEach, describe, expect, it, vi } from "vitest";

const findRelevantChunksMock = vi.hoisted(() => vi.fn());
const documentFindManyMock = vi.hoisted(() => vi.fn());
const documentFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rag", () => ({
  findRelevantChunks: findRelevantChunksMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      findMany: documentFindManyMock,
      findUnique: documentFindUniqueMock,
    },
  },
}));

import { buildAgentTools } from "../tools";

function makeCollector() {
  const urls: string[] = [];
  return { urls, add: (u: string) => urls.push(u) };
}

// AI SDK tool execute() returns `Result | AsyncIterable<Result> | undefined`
// at the type level. In our tools we always return a plain object, so this
// helper narrows the call site for the assertions below.
async function runTool<R>(tool: unknown, input: unknown): Promise<R> {
  const t = tool as {
    execute?: (input: unknown, ctx: unknown) => Promise<R>;
  };
  if (!t.execute) throw new Error("tool has no execute()");
  return (await t.execute(input, { messages: [], toolCallId: "t1" })) as R;
}

describe("buildAgentTools", () => {
  beforeEach(() => {
    findRelevantChunksMock.mockReset();
    documentFindManyMock.mockReset();
    documentFindUniqueMock.mockReset();
  });

  describe("searchExtranjeriaCorpus", () => {
    it("returns chunks and collects URLs", async () => {
      findRelevantChunksMock.mockResolvedValue([
        {
          chunkId: "c1",
          content: "art. 31",
          documentId: "d1",
          similarity: 0.9,
          document: {
            title: "LO 4/2000",
            url: "https://boe.es/lo-4-2000",
            source: "boe",
            verifiedAt: new Date(),
          },
        },
      ]);
      const c = makeCollector();
      const tools = buildAgentTools(c);
      const out = await runTool<{ chunks: Array<{ documentUrl: string }> }>(
        tools.searchExtranjeriaCorpus,
        { query: "TIE", k: 5 },
      );
      expect(out.chunks).toHaveLength(1);
      expect(out.chunks[0].documentUrl).toBe("https://boe.es/lo-4-2000");
      expect(c.urls).toContain("https://boe.es/lo-4-2000");
    });

    it("clamps k above 10", async () => {
      findRelevantChunksMock.mockResolvedValue([]);
      const tools = buildAgentTools(makeCollector());
      await runTool(tools.searchExtranjeriaCorpus, { query: "x", k: 50 });
      expect(findRelevantChunksMock).toHaveBeenCalledWith("x", 10);
    });

    it("returns empty chunks when no matches", async () => {
      findRelevantChunksMock.mockResolvedValue([]);
      const tools = buildAgentTools(makeCollector());
      const out = await runTool<{ chunks: unknown[] }>(tools.searchExtranjeriaCorpus, {
        query: "x",
      });
      expect(out.chunks).toEqual([]);
    });
  });

  describe("listRecentDocumentChanges", () => {
    it("defaults sinceDays to 30 and returns docs", async () => {
      const now = new Date();
      documentFindManyMock.mockResolvedValue([
        { id: "d1", title: "T", url: "https://boe.es/x", updatedAt: now },
      ]);
      const c = makeCollector();
      const tools = buildAgentTools(c);
      const out = await runTool<{ sinceDays: number; documents: unknown[] }>(
        tools.listRecentDocumentChanges,
        {},
      );
      expect(out.sinceDays).toBe(30);
      expect(out.documents).toHaveLength(1);
      expect(c.urls).toContain("https://boe.es/x");
      expect(documentFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
      );
    });
  });

  describe("fetchDocumentDetail", () => {
    it("returns metadata for an existing doc", async () => {
      documentFindUniqueMock.mockResolvedValue({
        id: "d1",
        title: "T",
        url: "https://boe.es/x",
        updatedAt: new Date("2026-01-01"),
        content: "lorem ipsum dolor",
      });
      const c = makeCollector();
      const tools = buildAgentTools(c);
      const out = await runTool<Record<string, unknown>>(tools.fetchDocumentDetail, {
        documentId: "d1",
      });
      expect(out).toMatchObject({ id: "d1", url: "https://boe.es/x" });
      expect(c.urls).toContain("https://boe.es/x");
    });

    it("returns not_found for missing doc", async () => {
      documentFindUniqueMock.mockResolvedValue(null);
      const tools = buildAgentTools(makeCollector());
      const out = await runTool<Record<string, unknown>>(tools.fetchDocumentDetail, {
        documentId: "missing",
      });
      expect(out).toEqual({ error: "not_found" });
    });
  });
});
