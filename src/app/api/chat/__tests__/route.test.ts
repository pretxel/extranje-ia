import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Clerk mock ---
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: vi.fn().mockResolvedValue(null),
}));

// --- AI SDK mocks ---
vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toUIMessageStream: vi.fn().mockReturnValue(new ReadableStream()),
  }),
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  createUIMessageStream: vi.fn().mockImplementation(({ execute }) => {
    const writer = { write: vi.fn(), merge: vi.fn() };
    execute({ writer });
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn().mockImplementation(({ stream }) => {
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mocked-model"),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ clerkId: "user_123", email: "test@test.com", plan: "free", queriesUsed: 0 }),
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
});
