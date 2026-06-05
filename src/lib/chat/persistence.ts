import { generateId, type UIMessage } from "ai";
import { prisma } from "@/lib/db";

const TITLE_MAX = 80;

/** Build a short conversation title from the first user message. */
export function conversationTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

/**
 * Resolve the conversation id for a turn. Returns the supplied id ONLY when it
 * exists AND belongs to the user; otherwise returns a fresh, not-yet-persisted
 * id. This guarantees a user can never append to a conversation they don't own.
 */
export async function resolveConversationId({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId?: string | null;
}): Promise<string> {
  if (conversationId) {
    const owned = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (owned) return owned.id;
  }
  return generateId();
}

/**
 * Persist a completed turn atomically: create the conversation if it doesn't
 * exist yet, append the user and assistant messages, and increment the user's
 * query count. Called only after a successful generation.
 */
export async function persistTurn({
  conversationId,
  userId,
  userText,
  assistantText,
}: {
  conversationId: string;
  userId: string;
  userText: string;
  assistantText: string;
}): Promise<void> {
  await prisma.$transaction([
    prisma.conversation.upsert({
      where: { id: conversationId },
      create: { id: conversationId, userId, title: conversationTitle(userText) },
      update: {},
    }),
    prisma.message.create({
      data: { conversationId, role: "user", content: userText },
    }),
    prisma.message.create({
      data: { conversationId, role: "assistant", content: assistantText },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { queriesUsed: { increment: 1 } },
    }),
  ]);
}

/** Map a persisted message row to the AI SDK UI message shape (text only). */
export function toUIMessage(m: { id: string; role: string; content: string }): UIMessage {
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: m.content }],
  };
}

/**
 * Load the authenticated user's most recent conversation that has messages,
 * as UI messages ready to seed `useChat`. Returns `{ id: null, messages: [] }`
 * when the user has no prior conversation. Always user-scoped.
 */
export async function loadLatestConversation(
  userId: string,
): Promise<{ id: string | null; messages: UIMessage[] }> {
  const conversation = await prisma.conversation.findFirst({
    where: { userId, messages: { some: {} } },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return { id: null, messages: [] };

  return {
    id: conversation.id,
    messages: conversation.messages.map(toUIMessage),
  };
}
