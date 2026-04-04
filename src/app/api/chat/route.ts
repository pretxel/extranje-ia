import { openai } from "@ai-sdk/openai";
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

  // TODO: get last user message text and call findRelevantChunks(lastMessage, 5)
  const contextText = "Contexto de extranjería española. [Pendiente de integrar RAG]";
  const sources: Array<{ url: string; title: string }> = []; // TODO: from RAG results

  const result = streamText({
    model: openai("gpt-4o"),
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
