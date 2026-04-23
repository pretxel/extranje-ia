import { afterEach, describe, expect, it, vi } from "vitest";

const mockOpenAIModel = { provider: "openai", modelId: "gpt-4o" };
const mockAnthropicModel = { provider: "anthropic", modelId: "claude-sonnet-4-6" };
const mockGoogleModel = { provider: "google", modelId: "gemini-2.0-flash" };

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockImplementation(() => mockOpenAIModel),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockImplementation(() => mockAnthropicModel),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockImplementation(() => mockGoogleModel),
}));

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createLLMProvider } from "../../providers/llm";

describe("createLLMProvider", () => {
  const originalEnv = process.env.AI_CHAT_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_CHAT_PROVIDER;
    } else {
      process.env.AI_CHAT_PROVIDER = originalEnv;
    }
    vi.clearAllMocks();
  });

  it("returns OpenAI model when AI_CHAT_PROVIDER=openai", () => {
    process.env.AI_CHAT_PROVIDER = "openai";
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
    expect(openai).toHaveBeenCalledWith("gpt-4o");
  });

  it("returns OpenAI model when AI_CHAT_PROVIDER is not set", () => {
    delete process.env.AI_CHAT_PROVIDER;
    const model = createLLMProvider();
    expect(model).toBe(mockOpenAIModel);
    expect(openai).toHaveBeenCalledWith("gpt-4o");
  });

  it("returns Anthropic model when AI_CHAT_PROVIDER=anthropic", () => {
    process.env.AI_CHAT_PROVIDER = "anthropic";
    const model = createLLMProvider();
    expect(model).toBe(mockAnthropicModel);
    expect(anthropic).toHaveBeenCalledWith("claude-sonnet-4-6");
  });

  it("returns Google model when AI_CHAT_PROVIDER=google", () => {
    process.env.AI_CHAT_PROVIDER = "google";
    const model = createLLMProvider();
    expect(model).toBe(mockGoogleModel);
    expect(google).toHaveBeenCalledWith("gemini-2.0-flash");
  });

  it("throws a clear error for unknown provider", () => {
    process.env.AI_CHAT_PROVIDER = "cohere";
    expect(() => createLLMProvider()).toThrowError(
      'Unknown AI_CHAT_PROVIDER: "cohere". Valid values: "openai", "anthropic", "google"',
    );
  });
});
