import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Auth mock (Supabase identity via getOrCreateUser helper) ---
const mockGetOrCreateUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/user", () => ({
  getOrCreateUser: mockGetOrCreateUser,
}));

const authedUser = {
  id: "u_1",
  supabaseId: "sb_123",
  email: "test@test.com",
  plan: "free",
  queriesUsed: 0,
};

// --- AI SDK UI-stream mocks ---
const streamWriter = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock("ai", () => ({
  createUIMessageStream: vi.fn().mockImplementation(({ execute }) => {
    // Run the bridge but never let an async rejection escape the test.
    Promise.resolve(execute({ writer: streamWriter })).catch(() => {});
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn().mockImplementation(({ stream }) => {
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),
}));

// --- RAG retrieval + LangChain chain mocks (no real ChatOpenAI / network) ---
vi.mock("@/lib/rag", () => ({
  findRelevantChunks: vi.fn().mockResolvedValue([]),
}));

const buildRagChain = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    stream: vi.fn().mockImplementation(async () =>
      (async function* () {
        yield "Hola";
      })(),
    ),
  }),
);
vi.mock("@/lib/rag/chain", () => ({
  formatContext: vi.fn().mockReturnValue({ contextText: "ctx", sources: [] }),
  extractMessageText: vi.fn().mockReturnValue("query"),
  toLangChainHistory: vi.fn().mockReturnValue([]),
  buildMessages: vi.fn().mockReturnValue([]),
  buildRagChain,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

const resolveConversationId = vi.hoisted(() => vi.fn().mockResolvedValue("conv_1"));
const persistTurn = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/chat/persistence", () => ({
  resolveConversationId,
  persistTurn,
}));

vi.mock("@/lib/plans", () => ({
  hasReachedLimit: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/openai", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("mocked system prompt"),
}));

import { POST } from "../route";

function makeRequest(body: Record<string, unknown> = { messages: [] }) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    mockGetOrCreateUser.mockReset();
    buildRagChain.mockClear();
    streamWriter.write.mockClear();
    resolveConversationId.mockClear();
    persistTurn.mockClear();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetOrCreateUser.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns a streaming response when authenticated", async () => {
    mockGetOrCreateUser.mockResolvedValue(authedUser);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("response has Content-Type: text/event-stream", async () => {
    mockGetOrCreateUser.mockResolvedValue(authedUser);
    const res = await POST(makeRequest());
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("opens the text stream and builds the LangChain chain when authenticated", async () => {
    mockGetOrCreateUser.mockResolvedValue(authedUser);
    await POST(
      makeRequest({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      }),
    );
    expect(buildRagChain).toHaveBeenCalled();
    expect(streamWriter.write).toHaveBeenCalledWith({ type: "text-start", id: "msg-text" });
  });

  it("binds the conversation via a transient data part", async () => {
    mockGetOrCreateUser.mockResolvedValue(authedUser);
    await POST(
      makeRequest({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      }),
    );
    expect(resolveConversationId).toHaveBeenCalledWith({
      userId: authedUser.id,
      conversationId: undefined,
    });
    expect(streamWriter.write).toHaveBeenCalledWith({
      type: "data-conversation",
      data: { id: "conv_1" },
      transient: true,
    });
  });

  it("does not emit source-url parts", async () => {
    mockGetOrCreateUser.mockResolvedValue(authedUser);
    await POST(
      makeRequest({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      }),
    );
    const wroteSource = streamWriter.write.mock.calls.some(
      ([part]) => (part as { type?: string }).type === "source-url",
    );
    expect(wroteSource).toBe(false);
  });
});
