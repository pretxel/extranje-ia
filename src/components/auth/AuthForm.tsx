"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/auth/browser";

type Status = "idle" | "sending" | "sent" | "error";

export function AuthForm({ heading }: { heading: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const supabase = createClient();
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (err) {
      setError(err.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-8"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h1 className="font-display text-2xl font-semibold mb-6 text-center">{heading}</h1>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
        style={{ border: "1px solid var(--border)" }}
      >
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          o
        </span>
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {status === "sent" ? (
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Te enviamos un enlace de acceso a <strong>{email}</strong>. Revisa tu correo.
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full rounded-xl px-4 py-2.5 text-sm bg-transparent outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-60"
            style={{ background: "var(--accent)", color: "#070B14" }}
          >
            {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}
