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

import { createEmbeddingProvider, getEmbeddingDimensions } from "../../providers/embeddings";

describe("createEmbeddingProvider", () => {
  const originalEnv = process.env.AI_EMBEDDING_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_EMBEDDING_PROVIDER;
    } else {
      process.env.AI_EMBEDDING_PROVIDER = originalEnv;
    }
  });

  it("returns OpenAI embeddings when AI_EMBEDDING_PROVIDER=openai", () => {
    process.env.AI_EMBEDDING_PROVIDER = "openai";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("returns OpenAI embeddings when AI_EMBEDDING_PROVIDER is not set", () => {
    delete process.env.AI_EMBEDDING_PROVIDER;
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockOpenAIInstance);
  });

  it("returns Google embeddings when AI_EMBEDDING_PROVIDER=google", () => {
    process.env.AI_EMBEDDING_PROVIDER = "google";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    const provider = createEmbeddingProvider();
    expect(provider).toBe(mockGoogleInstance);
    expect(typeof provider.embedDocuments).toBe("function");
    expect(typeof provider.embedQuery).toBe("function");
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_EMBEDDING_PROVIDER = "cohere";
    expect(() => createEmbeddingProvider()).toThrowError(
      'Unknown AI_EMBEDDING_PROVIDER: "cohere". Valid values: "openai", "google"',
    );
  });

  it("reports 1536 dims for OpenAI", () => {
    process.env.AI_EMBEDDING_PROVIDER = "openai";
    expect(getEmbeddingDimensions()).toBe(1536);
  });

  it("reports 768 dims for Google", () => {
    process.env.AI_EMBEDDING_PROVIDER = "google";
    expect(getEmbeddingDimensions()).toBe(768);
  });
});
