"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
}

/**
 * Copy-to-clipboard control for an assistant answer. Feature-detects the
 * Clipboard API and renders nothing when it's unavailable (e.g. insecure
 * context) so the affordance never appears broken.
 */
export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  if (typeof navigator === "undefined" || !navigator.clipboard) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write rejected — leave the control idle.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Respuesta copiada" : "Copiar respuesta"}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium opacity-0 transition-all duration-200 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-ring)]"
      style={{ color: copied ? "var(--accent)" : "var(--text-muted)" }}
    >
      {copied ? (
        <>
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
            />
          </svg>
          Copiar
        </>
      )}
    </button>
  );
}
