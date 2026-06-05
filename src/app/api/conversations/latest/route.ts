import { getOrCreateUser } from "@/lib/auth/user";
import { loadLatestConversation } from "@/lib/chat/persistence";

/**
 * Returns the authenticated user's most recent conversation (with messages) so
 * the chat thread can be restored on load. `{ id: null, messages: [] }` when the
 * user has no prior conversation. Always user-scoped.
 */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const conversation = await loadLatestConversation(user.id);
  return Response.json(conversation);
}
