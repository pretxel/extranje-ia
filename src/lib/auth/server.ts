import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./config";

/**
 * Supabase client for Server Components and Route Handlers.
 * Reads/refreshes the session from cookies. Use `getUser()` (not `getSession()`)
 * for any authorization decision — it revalidates the JWT with Supabase.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (cookies are read-only there).
          // Safe to ignore — the middleware refreshes the session cookie.
        }
      },
    },
  });
}
