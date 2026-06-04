"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/auth/browser";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="w-full text-left text-sm font-medium px-3 py-2 rounded-xl transition-all hover:bg-white/5"
      style={{ color: "var(--text-muted)" }}
    >
      Cerrar sesión
    </button>
  );
}
