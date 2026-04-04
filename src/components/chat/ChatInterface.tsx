"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import UsageBanner from "./UsageBanner";

export default function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  // Show typing indicator when streaming but assistant message has no text yet
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isLoading &&
    lastMessage?.role === "assistant" &&
    !lastMessage.parts.some((p) => p.type === "text");

  return (
    <div className="flex flex-col h-full">
      <UsageBanner />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            <p className="text-lg font-medium text-gray-500">¿En qué te puedo ayudar?</p>
            <p className="text-sm">Consulta sobre NIE, TIE, visados, permisos de trabajo y más.</p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {showTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </span>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={(text) => sendMessage({ text })} isLoading={isLoading} />
    </div>
  );
}
