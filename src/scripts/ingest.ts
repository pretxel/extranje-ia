import { config } from "dotenv";

// Load .env.local first (Next.js convention), then fall back to .env — mirrors prisma.config.ts
config({ path: ".env.local" });
config({ path: ".env" });

import { runIngestion } from "@/lib/rag/pipeline";

runIngestion()
  .then((stats) => {
    console.log("Ingestion complete:", stats);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
