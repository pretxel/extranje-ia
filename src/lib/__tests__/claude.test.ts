import { describe, expect, it, vi } from "vitest";

// Mock Anthropic so the module-level `new Anthropic()` call doesn't require an API key
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import { buildSystemPrompt } from "../claude";

describe("buildSystemPrompt", () => {
  it("includes the passed context string in the output", () => {
    const ctx = "Artículo 1: El extranjero debe presentar el pasaporte.";
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain(ctx);
  });

  it("contains the legal disclaimer text", () => {
    const prompt = buildSystemPrompt("cualquier contexto");
    expect(prompt).toContain("orientativa");
    expect(prompt).toContain("asesoramiento jurídico");
  });

  it("contains instructions about citing sources", () => {
    const prompt = buildSystemPrompt("contexto de prueba");
    expect(prompt).toContain("Cita siempre la fuente");
  });

  it("instructs the assistant to refer to a specialist for complex cases", () => {
    const prompt = buildSystemPrompt("contexto");
    expect(prompt).toContain("abogado especialista");
  });

  it("different context strings produce different prompts", () => {
    const p1 = buildSystemPrompt("contexto uno");
    const p2 = buildSystemPrompt("contexto dos");
    expect(p1).not.toBe(p2);
  });

  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt("");
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
