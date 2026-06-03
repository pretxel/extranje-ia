import { auth, currentUser } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { buildAgentSystemPrompt } from "@/lib/agent/prompt";
import { agentChatModel } from "@/lib/agent/providers";
import { buildAgentTools } from "@/lib/agent/tools";
import { prisma } from "@/lib/db";
import type { Plan } from "@/lib/plans";
import { hasReachedLimit } from "@/lib/plans";

export async function POST(req: Request) {
  if (process.env.AGENT_CHAT_ENABLED !== "true") {
    return new Response("Not Found", { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

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
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const allowedUrls = new Set<string>();
      const emittedUrls = new Set<string>();
      const tools = buildAgentTools({
        add: (url) => {
          allowedUrls.add(url);
          if (!emittedUrls.has(url)) {
            emittedUrls.add(url);
            writer.write({
              type: "source-url",
              sourceId: url,
              url,
            });
          }
        },
      });

      const result = streamText({
        model: agentChatModel(),
        system: buildAgentSystemPrompt(),
        tools,
        stopWhen: stepCountIs(5),
        messages: modelMessages,

        onFinish: async () => {
          await prisma.user.update({
            where: { clerkId: userId },
            data: { queriesUsed: { increment: 1 } },
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
