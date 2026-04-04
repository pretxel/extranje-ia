import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { Plan } from "@/lib/plans";
import { getLimit } from "@/lib/plans";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Find or create user
  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId, email: `${userId}@pending.local`, plan: "free", queriesUsed: 0 },
    });
  }

  const plan = user.plan as Plan;
  return Response.json({
    plan,
    queriesUsed: user.queriesUsed,
    queriesLimit: getLimit(plan),
  });
}
