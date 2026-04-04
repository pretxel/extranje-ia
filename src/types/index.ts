// Re-export shared types from their canonical locations.
// Previously this file contained inline duplicates of chat-types,
// which risked diverging. All app code imports directly from the canonical paths.
export type { ChatMessage, SourceCitation, UserPlan } from "@/lib/chat-types";
export { PLAN_LIMITS } from "@/lib/chat-types";

// RAGChunk is defined here as a convenience alias matching the chunks table shape.
// It is not used elsewhere in the current codebase but is exported for future consumers.
export interface RAGChunk {
  id: string;
  content: string;
  documentId: string;
  metadata: Record<string, unknown>;
}
