-- digest() lives in pgcrypto; load it before the backfill below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AlterTable: add change-tracking columns to documents
ALTER TABLE "documents"
  ADD COLUMN "content_hash" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill content_hash for existing rows (sha256 of content)
UPDATE "documents"
  SET "content_hash" = encode(digest("content", 'sha256'), 'hex')
  WHERE "content_hash" IS NULL;

-- Backfill updated_at to scraped_at so existing rows are not "recently changed"
UPDATE "documents" SET "updated_at" = "scraped_at";

-- Index for "recent changes" queries
CREATE INDEX "documents_updated_at_idx" ON "documents"("updated_at");
