"use client";

import { useEffect, useState } from "react";
import type { UserPlan } from "@/lib/chat-types";

interface UserData {
  plan: UserPlan;
  queriesUsed: number;
  queriesLimit: number;
}

export default function UsageBanner() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data: UserData) => setUserData(data))
      .catch(() => {});
  }, []);

  async function handleUpgrade() {
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
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "white" }}
      >
        {loading ? "Redirigiendo..." : "Actualizar a Pro →"}
      </button>
    </div>
  );
}
