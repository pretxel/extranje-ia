"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";

const CHAT_ICON =
  "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z";
const AGENT_ICON =
  "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09Z";

function NavLinks({
  agentEnabled,
  onNavigate,
}: {
  agentEnabled: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard/chat", label: "Chat", icon: CHAT_ICON },
    ...(agentEnabled ? [{ href: "/dashboard/agent", label: "Agente", icon: AGENT_ICON }] : []),
  ];
  return (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
            style={{
              color: active ? "var(--text)" : "var(--text-muted)",
              background: active ? "rgba(255,107,53,0.1)" : undefined,
              boxShadow: active ? "inset 2px 0 0 var(--accent)" : undefined,
            }}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <span className="font-display text-lg font-semibold">
      Extranjería<span style={{ color: "var(--accent)" }}>.ai</span>
    </span>
  );
}

export default function DashboardShell({
  agentEnabled,
  children,
}: {
  agentEnabled: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col md:flex"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Brand />
        </div>
        <NavLinks agentEnabled={agentEnabled} />
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="flex items-center gap-3 px-4 py-3 md:hidden"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-white/5"
            style={{ color: "var(--text)" }}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <Brand />
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.6)" }}
            />
            <aside
              className="absolute inset-y-0 left-0 flex w-64 flex-col"
              style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
            >
              <div
                className="flex items-center justify-between p-5"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <Brand />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <NavLinks agentEnabled={agentEnabled} onNavigate={() => setOpen(false)} />
              <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
                <SignOutButton />
              </div>
            </aside>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
