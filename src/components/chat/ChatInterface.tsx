"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import SuggestedPrompts from "./SuggestedPrompts";
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
    <div className="mesh-bg flex h-full flex-col">
      <UsageBanner userData={usage} />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.length === 0 && (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-5 text-center">
            <div className="fade-up space-y-2">
              <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--text)" }}>
                ¿En qué te puedo ayudar?
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Consultas sobre NIE, TIE, visados, arraigo y residencia — respuestas con fuentes
                verificadas.
              </p>
            </div>
            <SuggestedPrompts onSelect={handleSend} />
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {showTyping && (
          <div className="msg-in flex justify-start" role="status" aria-label="Generando respuesta">
            <div
              className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3.5"
              style={{ background: "var(--chat-assistant-bg)", border: "1px solid var(--border)" }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {showError && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          style={{
            background: "var(--danger-bg)",
            borderTop: "1px solid var(--danger-border)",
            color: "var(--danger)",
          }}
          aria-live="assertive"
        >
          <span>No se pudo generar la respuesta.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--danger)", color: "#1a0508" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {showLimit && (
        <div
          className="px-4 py-2.5 text-sm"
          style={{
            background: "rgba(255, 107, 53, 0.08)",
            borderTop: "1px solid rgba(255, 107, 53, 0.2)",
            color: "var(--accent-warm)",
          }}
          role="status"
        >
          ⚠️ Has agotado tus consultas gratuitas. Actualiza a Pro para seguir consultando.
        </div>
      )}

      <ChatInput onSend={handleSend} isLoading={isLoading} disabled={Boolean(showLimit)} />
    </div>
  );
}
