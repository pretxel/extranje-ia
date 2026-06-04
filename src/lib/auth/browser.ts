import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/** Supabase client for Client Components (login buttons, sign-out). */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
