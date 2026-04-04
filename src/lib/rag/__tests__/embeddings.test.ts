import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEmbedDocuments, mockEmbedQuery } = vi.hoisted(() => ({
  mockEmbedDocuments: vi.fn(),
  mockEmbedQuery: vi.fn(),
}));

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    embedDocuments: mockEmbedDocuments,
    embedQuery: mockEmbedQuery,
    model: "text-embedding-3-small",
  })),
}));

import { embeddings } from "../embeddings";

describe("embeddings", () => {
  beforeEach(() => {
    mockEmbedDocuments.mockReset();
    mockEmbedQuery.mockReset();
  });

  it("exports an OpenAIEmbeddings instance", () => {
    expect(embeddings).toBeDefined();
    expect(typeof embeddings.embedDocuments).toBe("function");
    expect(typeof embeddings.embedQuery).toBe("function");
  });

  it("embedDocuments returns one vector per input", async () => {
    const texts = ["texto uno", "texto dos", "texto tres"];
    mockEmbedDocuments.mockResolvedValueOnce(texts.map(() => Array(1536).fill(0.1)));
    const result = await embeddings.embedDocuments(texts);
    expect(result).toHaveLength(texts.length);
    expect(result[0]).toHaveLength(1536);
  });

  it("embedQuery returns a single vector", async () => {
    mockEmbedQuery.mockResolvedValueOnce(Array(1536).fill(0.2));
    const result = await embeddings.embedQuery("consulta de prueba");
    expect(result).toHaveLength(1536);
  });
});
