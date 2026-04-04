import type { UIMessage } from "ai";
import SourceCard from "./SourceCard";

interface MessageBubbleProps {
  message: UIMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const textParts = message.parts.filter((p) => p.type === "text");
  const sourceParts = message.parts.filter((p) => p.type === "source-url");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[75%]"
            : "bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[75%]"
        }
      >
        {textParts.map((part, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {part.text}
          </p>
        ))}

        {sourceParts.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Fuentes</p>
            {sourceParts.map((part, i) => (
              <SourceCard key={i} url={part.url} title={part.title} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
