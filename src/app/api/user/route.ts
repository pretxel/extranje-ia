import { getOrCreateUser } from "@/lib/auth/user";
import type { Plan } from "@/lib/plans";
import { getLimit } from "@/lib/plans";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const plan = user.plan as Plan;
  return Response.json({
    plan,
    queriesUsed: user.queriesUsed,
    queriesLimit: getLimit(plan),
  });
}
