import type { ScrapedDocument } from "@/lib/rag/types";
import { scrapeBOE } from "./boe";
import { scrapeSede } from "./sede";

export { scrapeBOE } from "./boe";
export { scrapeSede } from "./sede";

export async function scrapeAll(): Promise<ScrapedDocument[]> {
  const [boe, sede] = await Promise.allSettled([scrapeBOE(), scrapeSede()]);
  const results: ScrapedDocument[] = [];

  if (boe.status === "fulfilled") results.push(...boe.value);
  else console.error("[scraper] BOE failed:", boe.reason);

  if (sede.status === "fulfilled") results.push(...sede.value);
  else console.error("[scraper] SEDE failed:", sede.reason);

  return results;
}
