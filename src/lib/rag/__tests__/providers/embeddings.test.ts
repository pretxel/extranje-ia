import { afterEach, describe, expect, it, vi } from "vitest";

const { mockOpenAIInstance, mockGoogleInstance } = vi.hoisted(() => ({
  mockOpenAIInstance: {
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  },
  mockGoogleInstance: {
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  },
}));

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => mockOpenAIInstance),
}));

vi.mock("../../providers/google-embeddings", () => ({
  GoogleEmbeddings: vi.fn().mockImplementation(() => mockGoogleInstance),
}));

import { createEmbeddingProvider } from "../../providers/embeddings";

describe("createEmbeddingProvider", () => {
  const originalEnv = process.env.AI_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalEnv;
    }
  });

  it("returns OpenAI embeddings when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("returns OpenAI embeddings when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
  });

  it("returns Google embeddings when AI_PROVIDER=google", () => {
    process.env.AI_PROVIDER = "google";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockGoogleInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_PROVIDER = "cohere";
    expect(() => createEmbeddingProvider()).toThrowError(
      'Unknown AI_PROVIDER: "cohere". Valid values: "openai", "google"',
    );
  });
});
