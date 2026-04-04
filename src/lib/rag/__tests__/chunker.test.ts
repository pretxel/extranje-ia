import { describe, expect, it } from "vitest";
import { chunkDocument } from "../chunker";

const META = { source: "boe", url: "https://boe.es/test" };

describe("chunkDocument", () => {
  it("returns empty array for empty string", async () => {
    const result = await chunkDocument("", "doc-1", META);
    expect(result).toEqual([]);
  });

  it("returns a single chunk for short text", async () => {
    const content = "Esta es una frase corta sobre extranjería española.";
    const result = await chunkDocument(content, "doc-1", META);
    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toContain("Esta es una frase corta");
  });

  it("returns multiple chunks for text longer than chunkSize (9000 chars)", async () => {
    const sentence =
      "El solicitante deberá presentar la documentación requerida en el plazo establecido. ";
    const longContent = sentence.repeat(120); // ~10080 chars
    const result = await chunkDocument(longContent, "doc-2", META);
    expect(result.length).toBeGreaterThan(1);
  });

  it("populates all required metadata fields correctly", async () => {
    const content = "Una frase de prueba para validar los metadatos.";
    const result = await chunkDocument(content, "doc-42", META);
    expect(result).toHaveLength(1);

    const chunk = result[0];
    expect(chunk.metadata.documentId).toBe("doc-42");
    expect(chunk.metadata.source).toBe("boe");
    expect(chunk.metadata.url).toBe("https://boe.es/test");
  });

  it("chunks include overlap for long content", async () => {
    const sentence =
      "El solicitante deberá presentar la documentación requerida en el plazo establecido. ";
    const longContent = sentence.repeat(120);
    const result = await chunkDocument(longContent, "doc-3", META);

    // With chunkOverlap: 200, consecutive chunks share text
    const firstEnd = result[0].pageContent.slice(-100);
    expect(result[1].pageContent).toContain(firstEnd.trim());
  });

  it("first chunk starts with the beginning of content", async () => {
    const sentence =
      "El solicitante deberá presentar la documentación requerida en el plazo establecido. ";
    const longContent = sentence.repeat(120);
    const result = await chunkDocument(longContent, "doc-4", META);
    expect(result[0].pageContent.startsWith("El")).toBe(true);
  });
});
