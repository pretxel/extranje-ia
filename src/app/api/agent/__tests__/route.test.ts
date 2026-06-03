import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    clerkId: "user_123",
    email: "test@test.com",
    plan: "free",
    queriesUsed: 0,
  }),
);
const mockHasReachedLimit = vi.hoisted(() => vi.fn().mockReturnValue(false));
const writerWriteCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toUIMessageStream: vi.fn().mockReturnValue(new ReadableStream()),
  }),
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  stepCountIs: vi.fn().mockReturnValue(() => true),
  createUIMessageStream: vi.fn().mockImplementation(({ execute }) => {
    const writer = {
      write: vi.fn().mockImplementation((part) => {
        writerWriteCalls.push(part);
      }),
      merge: vi.fn(),
    };
    execute({ writer });
    return new ReadableStream();
  }),
  createUIMessageStreamResponse: vi.fn().mockImplementation(({ stream }) => {
    return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mocked-model"),
}));

vi.mock("@/lib/agent/tools", () => ({
  buildAgentTools: vi.fn().mockImplementation((collector: { add: (u: string) => void }) => {
    // Simulate the search tool emitting a URL during the turn.
    collector.add("https://boe.es/test");
    return {};
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: vi.fn(),
      update: mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/plans", () => ({
  hasReachedLimit: mockHasReachedLimit,
}));

import { POST } from "../route";

function makeRequest(body: Record<string, unknown> = { messages: [] }) {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockUserUpdate.mockReset();
    mockHasReachedLimit.mockReturnValue(false);
    writerWriteCalls.length = 0;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AGENT_CHAT_ENABLED = "true";
  });

  afterEach(() => {
    delete process.env.AGENT_CHAT_ENABLED;
  });

  it("returns 404 when AGENT_CHAT_ENABLED is not 'true'", async () => {
    process.env.AGENT_CHAT_ENABLED = "false";
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 402 when user is over plan limit", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockHasReachedLimit.mockReturnValue(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body).toEqual({ error: "limit_reached", plan: "free" });
  });

  it("streams a 200 response and emits a source-url for tool URLs", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(writerWriteCalls).toContainEqual(
      expect.objectContaining({
        type: "source-url",
        url: "https://boe.es/test",
      }),
    );
  });
});
