import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Clerk mock ---
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: vi.fn().mockResolvedValue(null),
}));

// --- AI SDK UI-stream mocks ---
vi.mock("ai", () => ({
  createUIMessageStream: vi.fn().mockImplementation(({ execute }) => {
    const writer = { write: vi.fn() };
    // Run the bridge but never let an async rejection escape the test.
    Promise.resolve(execute({ writer })).catch(() => {});
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
      findUnique: vi.fn().mockResolvedValue({
        clerkId: "user_123",
        email: "test@test.com",
        plan: "free",
        queriesUsed: 0,
      }),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
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
    mockAuth.mockReset();
    buildRagChain.mockClear();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns a streaming response when authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("response has Content-Type: text/event-stream", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const res = await POST(makeRequest());
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("builds the LangChain RAG chain when authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    await POST(
      makeRequest({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      }),
    );
    expect(buildRagChain).toHaveBeenCalled();
  });
});
