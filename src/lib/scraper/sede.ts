import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedDocument } from "@/lib/rag/types";

const SEDE_URL = "https://sede.administracion.gob.es/pagSede/tramites/tramitesListar.html";

const KEYWORDS = ["extranjería", "extranjeria", "nie", "tie", "residencia", "visado"];

const httpClient = axios.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; ExtranjeriaBot/1.0)",
  },
  timeout: 15000,
});

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

export async function scrapeSede(): Promise<ScrapedDocument[]> {
  console.log("[sede] Fetching procedures list...");
  const response = await httpClient.get(SEDE_URL);
  const $ = cheerio.load(response.data);

  const docs: ScrapedDocument[] = [];

  // Each procedure is typically in a list item or table row with a title and description
  $("li, tr, .tramite, .procedimiento, article").each((_, el) => {
    const titleEl = $(el).find("a, h2, h3, .titulo, .title").first();
    const title = titleEl.text().trim();
    const description = $(el).find("p, .descripcion, .description, span").text().trim();
    const combined = `${title} ${description}`;

    if (!title || !matchesKeywords(combined)) return;

    const href = titleEl.attr("href") || $(el).find("a").first().attr("href");
    let url = SEDE_URL;

    if (href) {
      url = href.startsWith("http") ? href : `https://sede.administracion.gob.es${href}`;
    }

    const content = description || title;

    docs.push({
      url,
      title,
      content,
      source: "sede",
      scrapedAt: new Date(),
    });
  });

  console.log(`[sede] Found ${docs.length} matching procedures`);
  return docs;
}
