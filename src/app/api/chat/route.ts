import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { getOrCreateUser } from "@/lib/auth/user";
import { persistTurn, resolveConversationId } from "@/lib/chat/persistence";
import { buildSystemPrompt } from "@/lib/openai";
import type { Plan } from "@/lib/plans";
import { hasReachedLimit } from "@/lib/plans";
import { findRelevantChunks } from "@/lib/rag";
import {
  buildMessages,
  buildRagChain,
  extractMessageText,
  formatContext,
  toLangChainHistory,
} from "@/lib/rag/chain";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (hasReachedLimit(user.plan as Plan, user.queriesUsed)) {
    return new Response(JSON.stringify({ error: "limit_reached", plan: user.plan }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, conversationId }: { messages: UIMessage[]; conversationId?: string | null } =
    await req.json();

  // Last user message drives RAG retrieval; everything before it is chat history.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const queryText = lastUserMessage ? extractMessageText(lastUserMessage) : "";

  const ragResults = queryText ? await findRelevantChunks(queryText, 5) : [];
  const { contextText } = formatContext(ragResults);
  const history = toLangChainHistory(messages.filter((m) => m !== lastUserMessage));
  const systemPrompt = buildSystemPrompt(contextText);

  // Resolve before streaming so the client can bind the thread on the first turn.
  const resolvedConversationId = await resolveConversationId({
    userId: user.id,
    conversationId,
  });

  let completed = false;
  let assistantText = "";
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Bind the conversation on the client (transient: not added to history,
      // surfaced only via the client's onData handler).
      writer.write({
        type: "data-conversation",
        data: { id: resolvedConversationId },
        transient: true,
      });

      const id = "msg-text";
      writer.write({ type: "text-start", id });
      try {
        const llmStream = await buildRagChain().stream(
          buildMessages({ system: systemPrompt, history, question: queryText }),
        );
        for await (const chunk of llmStream) {
          if (chunk) {
            assistantText += chunk;
            writer.write({ type: "text-delta", id, delta: chunk });
          }
        }
        completed = true;
      } finally {
        writer.write({ type: "text-end", id });
      }
    },
    onError: (error) => {
      console.error("[chat] stream error:", error);
      return "Error generando la respuesta. Inténtalo de nuevo.";
    },
    onFinish: async () => {
      // Persist only a fully generated turn; a failed/partial answer writes
      // nothing and never burns a query.
      if (!completed || !queryText || !assistantText) return;
      try {
        await persistTurn({
          conversationId: resolvedConversationId,
          userId: user.id,
          userText: queryText,
          assistantText,
        });
      } catch (err) {
        // The user already has the answer; a persistence failure must not crash
        // stream teardown, but it must be visible to diagnose dropped turns.
        console.error("[chat] persistTurn failed:", err);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
