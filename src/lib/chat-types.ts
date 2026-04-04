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

export const PLAN_LIMITS: Record<UserPlan, number> = {
  free: 5,
  pro: Infinity,
  // empresa: Infinity,
};
