import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt, filterAllowedSourceUrls } from "../prompt";

describe("buildAgentSystemPrompt", () => {
  it("requires tool grounding and includes the disclaimer", () => {
    const p = buildAgentSystemPrompt();
    expect(p).toContain("searchExtranjeriaCorpus");
    expect(p).toContain("listRecentDocumentChanges");
    expect(p).toContain("orientativa, no asesoramiento jurídico");
  });
});

describe("filterAllowedSourceUrls", () => {
  it("keeps URLs that came from tool results", () => {
    const allowed = new Set(["https://boe.es/x"]);
    expect(filterAllowedSourceUrls({ url: "https://boe.es/x" }, allowed)).toBe(true);
  });

  it("strips URLs not present in tool results (hallucinated citations)", () => {
    const allowed = new Set(["https://boe.es/x"]);
    expect(filterAllowedSourceUrls({ url: "https://evil.com/fake" }, allowed)).toBe(false);
  });
});
