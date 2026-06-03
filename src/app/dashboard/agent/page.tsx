import { notFound } from "next/navigation";
import AgentChat from "@/components/agent/AgentChat";

export default function AgentPage() {
  if (process.env.AGENT_CHAT_ENABLED !== "true") notFound();

  return (
    <div className="h-full">
      <AgentChat />
    </div>
  );
}
