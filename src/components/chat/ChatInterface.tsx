"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import UsageBanner from "./UsageBanner";
import { useUsage } from "./useUsage";

// Chat messages carry one transient data part: the resolved conversation id,
// streamed once per turn so the client can bind/keep the thread.
type ChatUIMessage = UIMessage<never, { conversation: { id: string } }>;

export default function ChatInterface() {
  const conversationIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const { usage, refetch: refetchUsage } = useUsage();
  const [limitReached, setLimitReached] = useState(false);

  const { messages, sendMessage, status, setMessages, error, clearError, regenerate } =
    useChat<ChatUIMessage>({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        // Dynamic: send the current thread id (null on the very first turn).
        body: () => ({ conversationId: conversationIdRef.current }),
      }),
      onData: (part) => {
        if (part.type === "data-conversation") {
          conversationIdRef.current = part.data.id;
        }
      },
      onError: (err) => {
        if (err.message?.includes("limit_reached")) {
          setLimitReached(true);
          refetchUsage();
        }
      },
      onFinish: ({ isError }) => {
        // onFinish also fires on the error path (incl. 402); don't clobber the
        // limit/error state that onError just set.
        if (isError) return;
        setLimitReached(false);
        refetchUsage();
      },
    });

  // Restore the most recent conversation on mount (usage is loaded by useUsage).
  // Guard against clobbering a thread the user may have started before the
  // restore fetch resolved (fast send / slow DB) and against a late resolve
  // after unmount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/conversations/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id: string | null; messages: ChatUIMessage[] } | null) => {
        if (cancelled || !data) return;
        if (data.id && conversationIdRef.current === null) {
          conversationIdRef.current = data.id;
        }
        if (data.messages?.length) {
          setMessages((prev) => (prev.length === 0 ? data.messages : prev));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to the newest content as messages stream in, unless the user
  // has scrolled up to read earlier history.
  useEffect(() => {
    if (messages.length === 0) return;
    const container = scrollContainerRef.current;
    if (container && isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const c = scrollContainerRef.current;
    if (!c) return;
    isNearBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
  };

  // Show typing indicator when streaming but assistant message has no text yet.
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isLoading &&
    lastMessage?.role === "assistant" &&
    !lastMessage.parts.some((p) => p.type === "text");

  const atLimit = usage?.plan === "free" && usage.queriesUsed >= usage.queriesLimit;
  const showLimit = limitReached || atLimit;
  const showError = !showLimit && Boolean(error);

  const handleSend = (text: string) => {
    isNearBottomRef.current = true;
    sendMessage({ text });
  };

  const handleRetry = () => {
    clearError();
    regenerate();
  };

  return (
    <div className="flex flex-col h-full">
      <UsageBanner userData={usage} />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
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

      {showError && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm bg-red-50 border-t border-red-200 text-red-700">
          <span>No se pudo generar la respuesta.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white transition-opacity hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {showLimit && (
        <div className="px-4 py-2 text-sm bg-amber-50 border-t border-amber-200 text-amber-800">
          ⚠️ Has agotado tus consultas gratuitas. Actualiza a Pro para seguir consultando.
        </div>
      )}

      <ChatInput onSend={handleSend} isLoading={isLoading} disabled={Boolean(showLimit)} />
    </div>
  );
}
