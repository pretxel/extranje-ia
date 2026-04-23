import { auth, currentUser } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/openai";
import type { Plan } from "@/lib/plans";
import { hasReachedLimit } from "@/lib/plans";
import { findRelevantChunks } from "@/lib/rag";
import { createLLMProvider } from "@/lib/rag/providers/llm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Find or create user and check usage limits
  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@pending.local`;
    user = await prisma.user.create({
      data: { clerkId: userId, email, plan: "free", queriesUsed: 0 },
    });
  }

  if (hasReachedLimit(user.plan as Plan, user.queriesUsed)) {
    return new Response(JSON.stringify({ error: "limit_reached", plan: user.plan }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Extract last user message text for RAG retrieval
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const queryText =
    lastUserMessage?.parts
      ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  // RAG: retrieve relevant chunks and build context
  const ragResults = queryText ? await findRelevantChunks(queryText, 5) : [];
  const contextText =
    ragResults.length > 0
      ? ragResults
          .map((r) => `[Fuente: ${r.document.title} — ${r.document.url}]\n${r.content}`)
          .join("\n\n---\n\n")
      : "No se encontró contexto relevante en las fuentes verificadas.";
  const sources = ragResults.map((r) => ({ url: r.document.url, title: r.document.title }));

  const result = streamText({
    model: createLLMProvider(),
    system: buildSystemPrompt(contextText),
    messages: await convertToModelMessages(messages),

    onFinish: async () => {
      await prisma.user.update({
        where: { clerkId: userId },
        data: { queriesUsed: { increment: 1 } },
      });
    },
  });

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      for (const source of sources) {
        writer.write({
          type: "source-url",
          sourceId: source.url,
          url: source.url,
          title: source.title,
        });
      }
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
