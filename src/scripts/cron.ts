import "dotenv/config";
import cron from "node-cron";
import { runIngestion } from "@/lib/rag/pipeline";

cron.schedule("0 2 * * *", async () => {
  console.log(`[cron] Starting daily ingestion at ${new Date().toISOString()}`);
  try {
    const stats = await runIngestion();
    console.log("[cron] Done:", stats);
  } catch (err) {
    console.error("[cron] Failed:", err);
  }
});

console.log("[cron] Scheduler started. Ingestion runs daily at 02:00 AM.");
