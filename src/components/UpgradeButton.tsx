"use client";

import { useState } from "react";

interface UpgradeButtonProps {
  plan: "pro" | "empresa";
  label: string;
  highlight?: boolean;
}

export default function UpgradeButton({ plan, label, highlight }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = "/sign-up";
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("[UpgradeButton] checkout error:", res.status, text);
        setLoading(false);
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("[UpgradeButton] unexpected error:", err);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
      style={
        highlight
          ? {
              background: "linear-gradient(135deg, var(--accent), #E8531A)",
              color: "white",
              boxShadow: "0 8px 20px rgba(255,107,53,0.3)",
            }
          : {
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
              border: "1px solid rgba(255,255,255,0.1)",
            }
      }
    >
      {loading ? "Redirigiendo..." : label}
    </button>
  );
}
