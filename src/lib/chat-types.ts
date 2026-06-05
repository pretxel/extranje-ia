export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  createdAt: Date;
}

export interface SourceCitation {
  documentId: string;
  title: string;
  url: string;
  source: "boe" | "sede" | "sepe";
  verifiedAt: Date;
  excerpt: string;
}

export type UserPlan = "free" | "pro";

// Plan query limits live solely in `src/lib/plans.ts` (the canonical source).
// Import { PLAN_LIMITS, getLimit, hasReachedLimit } from "@/lib/plans".
