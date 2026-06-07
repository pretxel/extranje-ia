import type { UIMessage } from "ai";
import CopyButton from "./CopyButton";

interface MessageBubbleProps {
  message: UIMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((p) => p.type === "text");
  const text = textParts.map((p) => p.text).join("\n");

  if (isUser) {
    return (
      <div className="msg-in flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm"
          style={{ background: "var(--chat-user-grad)", color: "var(--chat-user-ink)" }}
        >
          <p className="whitespace-pre-wrap font-medium">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in flex justify-start">
      <div
        data-testid="assistant-message"
        className="group relative max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "var(--chat-assistant-bg)",
          border: "1px solid var(--border)",
          borderLeftColor: "var(--accent)",
          borderLeftWidth: "2px",
          color: "var(--text)",
        }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-display text-xs font-semibold" style={{ color: "var(--accent)" }}>
            Extranjería
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            orientación verificada
          </span>
        </div>

        {textParts.map((part) => (
          <p key={part.text} className="whitespace-pre-wrap">
            {part.text}
          </p>
        ))}

        <div className="mt-1.5 flex justify-end">
          <CopyButton text={text} />
        </div>
      </div>
    </div>
  );
}
