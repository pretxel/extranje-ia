import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedDocument } from "@/lib/rag/types";

const BASE_URL = "https://www.boe.es";
const CODIGO_URL = `${BASE_URL}/biblioteca_juridica/codigos/codigo.php?id=70&modo=2&nota=0&tab=2`;
const USER_AGENT = "Mozilla/5.0 (compatible; ExtranjeriaBot/1.0)";

const httpClient = axios.create({
  headers: { "User-Agent": USER_AGENT },
  timeout: 20000,
});

/** Fetch all consolidated-law links from the Código de Extranjería index page */
async function fetchLawLinks(): Promise<Array<{ url: string; title: string }>> {
  const response = await httpClient.get(CODIGO_URL);
  const $ = cheerio.load(response.data);
  const links: Array<{ url: string; title: string }> = [];

  // Each law entry is an <a> whose href matches /buscar/act.php?id=BOE-A-*
  $('a[href*="act.php?id=BOE-A"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const title = $(el).text().trim();

    if (title && !links.some((l) => l.url === fullUrl)) {
      links.push({ url: fullUrl, title });
    }
  });

  return links;
}

/** Fetch the full consolidated text of a single law */
async function fetchLawContent(url: string): Promise<string | null> {
  try {
    const response = await httpClient.get(url);
    const $ = cheerio.load(response.data);

    // Primary: full rendered text block
    let content = $("#textoxslt").text().trim();

    // Fallback: individual paragraphs
    if (!content) {
      content = $(".parrafo")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n\n");
    }

    // Last resort: main content area
    if (!content) {
      content = $("#contenido").text().trim();
    }

    return content || null;
  } catch (err) {
    console.error(`[boe] Error fetching law content from ${url}:`, err);
    return null;
  }
}

export async function scrapeBOE(): Promise<ScrapedDocument[]> {
  console.log("[boe] Fetching Código de Extranjería index...");
  const links = await fetchLawLinks();
  console.log(`[boe] Found ${links.length} laws in index`);

  const docs: ScrapedDocument[] = [];

  for (const { url, title } of links) {
    try {
      console.log(`[boe] Fetching: ${title}`);
      const content = await fetchLawContent(url);

      if (!content) {
        console.warn(`[boe] No content for: ${title} (${url})`);
        continue;
      }

      docs.push({
        url,
        title,
        content,
        source: "boe",
        scrapedAt: new Date(),
      });
    } catch (err) {
      console.error(`[boe] Skipping law "${title}":`, err);
    }
  }

  console.log(`[boe] Done — ${docs.length} laws scraped`);
  return docs;
}
