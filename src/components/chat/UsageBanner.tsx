"use client";

import { useState } from "react";
import type { UserPlan } from "@/lib/chat-types";
import { paidPlansEnabled } from "@/lib/plans";

export interface UsageData {
  plan: UserPlan;
  queriesUsed: number;
  queriesLimit: number;
}

interface UsageBannerProps {
  userData: UsageData | null;
}

export default function UsageBanner({ userData }: UsageBannerProps) {
  const [loading, setLoading] = useState(false);
  const paidEnabled = paidPlansEnabled();

  async function handleUpgrade() {
    if (!paidEnabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  if (!userData || userData.plan !== "free") return null;

  const atLimit = userData.queriesUsed >= userData.queriesLimit;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm"
      style={{
        background: atLimit ? "rgba(255,107,53,0.08)" : "rgba(245,166,35,0.06)",
        borderBottom: `1px solid ${atLimit ? "rgba(255,107,53,0.2)" : "rgba(245,166,35,0.15)"}`,
      }}
    >
      <span style={{ color: atLimit ? "var(--accent)" : "var(--text-muted)" }}>
        {atLimit ? (
          "⚠️ Has agotado tus 5 consultas gratuitas"
        ) : (
          <>
            Has usado <strong style={{ color: "var(--text)" }}>{userData.queriesUsed}</strong> de{" "}
            <strong style={{ color: "var(--text)" }}>{userData.queriesLimit}</strong> consultas
            gratuitas
          </>
        )}
      </span>
      {paidEnabled ? (
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {loading ? "Redirigiendo..." : "Actualizar a Pro →"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-muted)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Próximamente
        </button>
      )}
    </div>
  );
}
