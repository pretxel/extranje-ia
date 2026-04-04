import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const mockInstance = { get: vi.fn() };
  return {
    default: { create: vi.fn(() => mockInstance) },
    __mockInstance: mockInstance,
  };
});

import { scrapeBOE } from "../boe";

const axiosMock = (axios as unknown as { create: ReturnType<typeof vi.fn> }).create();
const mockGet = axiosMock.get as ReturnType<typeof vi.fn>;

const BASE_URL = "https://www.boe.es";

/** Index page with act.php law links — mirrors the Código de Extranjería structure */
const makeIndexPage = (laws: Array<{ id: string; title: string }>) => `
  <html><body>
    <div id="contenedor">
      <ul>
        ${laws
          .map(
            (l) => `
          <li>
            <a href="/buscar/act.php?id=${l.id}" title="Abre la disposición consolidada ${l.id}">
              ${l.title}
            </a>
          </li>`,
          )
          .join("")}
      </ul>
    </div>
  </body></html>
`;

/** Individual law page */
const makeLawPage = (content: string) => `
  <html><body>
    <div id="textoxslt">${content}</div>
  </body></html>
`;

describe("scrapeBOE", () => {
  beforeEach(() => mockGet.mockReset());

  it("fetches laws from the Código de Extranjería index", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([{ id: "BOE-A-2000-544", title: "Ley Orgánica 4/2000" }]),
      })
      .mockResolvedValueOnce({ data: makeLawPage("Texto consolidado de la ley de extranjería.") });

    const results = await scrapeBOE();
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(`${BASE_URL}/buscar/act.php?id=BOE-A-2000-544`);
    expect(results[0].title).toBe("Ley Orgánica 4/2000");
    expect(results[0].content).toBe("Texto consolidado de la ley de extranjería.");
  });

  it('sets source to "boe" on all documents', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([
          { id: "BOE-A-2000-544", title: "Ley 1" },
          { id: "BOE-A-2011-9538", title: "Ley 2" },
        ]),
      })
      .mockResolvedValueOnce({ data: makeLawPage("Contenido ley 1.") })
      .mockResolvedValueOnce({ data: makeLawPage("Contenido ley 2.") });

    const results = await scrapeBOE();
    results.forEach((doc) => expect(doc.source).toBe("boe"));
  });

  it("returns correct document shape", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([{ id: "BOE-A-2024-001", title: "Reglamento NIE" }]),
      })
      .mockResolvedValueOnce({ data: makeLawPage("Artículo 1. Requisitos del NIE.") });

    const [doc] = await scrapeBOE();
    expect(doc).toMatchObject({ source: "boe", title: "Reglamento NIE" });
    expect(doc.content).toBeTruthy();
    expect(doc.scrapedAt).toBeInstanceOf(Date);
  });

  it("skips laws that return no content", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([{ id: "BOE-A-2024-002", title: "Sin contenido" }]),
      })
      .mockResolvedValueOnce({ data: "<html><body><p>Nothing here</p></body></html>" });

    const results = await scrapeBOE();
    expect(results).toHaveLength(0);
  });

  it("handles a failed law fetch gracefully and continues", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([
          { id: "BOE-A-2000-544", title: "Ley válida" },
          { id: "BOE-A-2024-BAD", title: "Ley con error" },
        ]),
      })
      .mockResolvedValueOnce({ data: makeLawPage("Contenido válido.") })
      .mockRejectedValueOnce(new Error("Network error"));

    const results = await scrapeBOE();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Ley válida");
  });

  it("returns empty array when index page fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Service unavailable"));
    await expect(scrapeBOE()).rejects.toThrow();
  });

  it("deduplicates laws with the same URL", async () => {
    // Index page with two entries pointing to the same law
    mockGet
      .mockResolvedValueOnce({
        data: makeIndexPage([
          { id: "BOE-A-2000-544", title: "Ley Orgánica 4/2000" },
          { id: "BOE-A-2000-544", title: "Ley Orgánica 4/2000 (duplicado)" },
        ]),
      })
      .mockResolvedValueOnce({ data: makeLawPage("Contenido.") });

    const results = await scrapeBOE();
    expect(results).toHaveLength(1);
  });
});
