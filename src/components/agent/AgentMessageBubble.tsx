import type { UIMessage } from "ai";
import SourceCard from "@/components/chat/SourceCard";
import ToolCallChip from "./ToolCallChip";

interface AgentMessageBubbleProps {
  message: UIMessage;
}

interface NormalizedToolPart {
  key: string;
  toolName: string;
  input: unknown;
  output: unknown;
  state?: string;
}

function normalizeToolPart(part: unknown): NormalizedToolPart | null {
  if (!part || typeof part !== "object") return null;
  const p = part as { type?: unknown };
  if (typeof p.type !== "string" || !p.type.startsWith("tool-")) return null;
  const cast = p as {
    type: string;
    toolName?: string;
    toolCallId?: string;
    input?: unknown;
    output?: unknown;
    state?: string;
  };
  const toolName = cast.toolName ?? cast.type.replace(/^tool-/, "");
  return {
    key: cast.toolCallId ?? `${cast.type}-${toolName}`,
    toolName,
    input: cast.input,
    output: cast.output,
    state: cast.state,
  };
}

export default function AgentMessageBubble({ message }: AgentMessageBubbleProps) {
  const isUser = message.role === "user";

  const textParts = message.parts.filter((p) => p.type === "text");
  const sourceParts = message.parts.filter((p) => p.type === "source-url");
  const toolParts = message.parts
    .map(normalizeToolPart)
    .filter((p): p is NormalizedToolPart => p !== null);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]"
            : "bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]"
        }
      >
        {!isUser &&
          toolParts.map((p) => (
            <ToolCallChip
              key={p.key}
              toolName={p.toolName}
              input={p.input}
              output={p.output}
              state={p.state}
            />
          ))}

        {textParts.map((part) => (
          <p key={part.text} className="whitespace-pre-wrap">
            {part.text}
          </p>
        ))}

        {sourceParts.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Fuentes</p>
            {sourceParts.map((part) => (
              <SourceCard key={part.url} url={part.url} title={part.title} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
