import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const agentEnabled = process.env.AGENT_CHAT_ENABLED === "true";

  return <DashboardShell agentEnabled={agentEnabled}>{children}</DashboardShell>;
}
