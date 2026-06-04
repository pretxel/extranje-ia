import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";

/**
 * OAuth + magic-link landing. Exchanges the auth `code` for a session cookie,
 * then redirects into the app. Used by both Google OAuth and email OTP links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/chat";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
}
