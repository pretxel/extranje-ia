import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./config";

// Routes that require an authenticated session.
const PROTECTED = [/^\/dashboard(\/|$)/, /^\/api\/(chat|agent|checkout|user)(\/|$)/];

/**
 * Refreshes the Supabase session cookie on every request and guards protected
 * routes. MUST return the `response` object that carries the refreshed cookies
 * — returning a different response drops the session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verifies the JWT with Supabase (do not rely on getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (PROTECTED.some((re) => re.test(path)) && !user) {
    if (path.startsWith("/api/")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
