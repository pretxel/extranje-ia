import type { User } from "@prisma/client";
import { createClient } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

/**
 * Returns the find-or-created application `User` row for the current Supabase
 * session, or `null` if unauthenticated. Keyed on the Supabase `auth.users`
 * UUID (`supabaseId`). Centralizes the pattern used by every protected route.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const email = authUser.email ?? `${authUser.id}@pending.local`;
  return prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {},
    create: { supabaseId: authUser.id, email, plan: "free", queriesUsed: 0 },
  });
}
