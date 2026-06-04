import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { getOrCreateUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db";
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

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Last user message drives RAG retrieval; everything before it is chat history.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const queryText = lastUserMessage ? extractMessageText(lastUserMessage) : "";

  const ragResults = queryText ? await findRelevantChunks(queryText, 5) : [];
  const { contextText, sources } = formatContext(ragResults);
  const history = toLangChainHistory(messages.filter((m) => m !== lastUserMessage));
  const systemPrompt = buildSystemPrompt(contextText);

  let completed = false;
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      for (const source of sources) {
        writer.write({
          type: "source-url",
          sourceId: source.url,
          url: source.url,
          title: source.title,
        });
      }

      const id = "msg-text";
      writer.write({ type: "text-start", id });
      try {
        const llmStream = await buildRagChain().stream(
          buildMessages({ system: systemPrompt, history, question: queryText }),
        );
        for await (const chunk of llmStream) {
          if (chunk) writer.write({ type: "text-delta", id, delta: chunk });
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
      if (!completed) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { queriesUsed: { increment: 1 } },
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
