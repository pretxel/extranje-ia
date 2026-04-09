import { afterEach, describe, expect, it, vi } from "vitest";

const mockOpenAIModel = { provider: "openai", modelId: "gpt-4o" };
const mockGoogleModel = { provider: "google", modelId: "gemini-2.0-flash" };

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockImplementation(() => mockOpenAIModel),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockImplementation(() => mockGoogleModel),
}));

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createLLMProvider } from "../../providers/llm";

describe("createLLMProvider", () => {
  const originalEnv = process.env.AI_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalEnv;
    }
    vi.clearAllMocks();
  });

  it("returns OpenAI model when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
    expect(openai).toHaveBeenCalledWith("gpt-4o");
  });

  it("returns OpenAI model when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
    expect(openai).toHaveBeenCalledWith("gpt-4o");
  });

  it("returns Google model when AI_PROVIDER=google", () => {
    process.env.AI_PROVIDER = "google";
    const model = createLLMProvider();
    expect(model).toBe(mockGoogleModel);
    expect(google).toHaveBeenCalledWith("gemini-2.0-flash");
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_PROVIDER = "cohere";
    expect(() => createLLMProvider()).toThrowError(
      'Unknown AI_PROVIDER: "cohere". Valid values: "openai", "google"',
    );
  });
});
