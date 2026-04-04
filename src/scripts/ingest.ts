import "dotenv/config";
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
