import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  conversation: {
    findFirst: vi.fn(),
    upsert: vi.fn((args: unknown) => ({ op: "upsert", args })),
  },
  message: {
    create: vi.fn((args: unknown) => ({ op: "message", args })),
  },
  user: {
    update: vi.fn((args: unknown) => ({ op: "user", args })),
  },
  $transaction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const generateId = vi.hoisted(() => vi.fn(() => "generated-id"));
vi.mock("ai", () => ({ generateId }));

import { conversationTitle, persistTurn, resolveConversationId, toUIMessage } from "../persistence";

beforeEach(() => {
  prismaMock.conversation.findFirst.mockReset();
  prismaMock.conversation.upsert.mockClear();
  prismaMock.message.create.mockClear();
  prismaMock.user.update.mockClear();
  prismaMock.$transaction.mockClear();
  generateId.mockClear();
});

describe("resolveConversationId", () => {
  it("returns the supplied id when it exists and is owned by the user", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue({ id: "c1" });
    const id = await resolveConversationId({ userId: "u1", conversationId: "c1" });
    expect(id).toBe("c1");
    expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", userId: "u1" },
      select: { id: true },
    });
    expect(generateId).not.toHaveBeenCalled();
  });

  it("returns a fresh id when no conversationId is supplied", async () => {
    const id = await resolveConversationId({ userId: "u1", conversationId: null });
    expect(id).toBe("generated-id");
    expect(prismaMock.conversation.findFirst).not.toHaveBeenCalled();
  });

  it("returns a fresh id when the conversation is not owned by the user", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null); // not owned / not found
    const id = await resolveConversationId({ userId: "u1", conversationId: "foreign" });
    expect(id).toBe("generated-id");
    // Ownership is always enforced via the userId filter.
    expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "foreign", userId: "u1" },
      select: { id: true },
    });
  });
});

describe("persistTurn", () => {
  it("writes both messages, upserts the conversation, and increments usage atomically", async () => {
    await persistTurn({
      conversationId: "c1",
      userId: "u1",
      userText: "¿Cómo saco el NIE?",
      assistantText: "Respuesta.",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const ops = prismaMock.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(4);

    expect(prismaMock.conversation.upsert).toHaveBeenCalledWith({
      where: { id: "c1" },
      create: { id: "c1", userId: "u1", title: "¿Cómo saco el NIE?" },
      update: {},
    });
    expect(prismaMock.message.create).toHaveBeenCalledWith({
      data: { conversationId: "c1", role: "user", content: "¿Cómo saco el NIE?" },
    });
    expect(prismaMock.message.create).toHaveBeenCalledWith({
      data: { conversationId: "c1", role: "assistant", content: "Respuesta." },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { queriesUsed: { increment: 1 } },
    });
  });
});

describe("conversationTitle", () => {
  it("keeps short text as-is", () => {
    expect(conversationTitle("  Hola   mundo ")).toBe("Hola mundo");
  });

  it("truncates long text with an ellipsis", () => {
    const title = conversationTitle("a".repeat(200));
    expect(title.length).toBe(80);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("toUIMessage", () => {
  it("maps a row to a text-only UI message preserving role", () => {
    expect(toUIMessage({ id: "m1", role: "assistant", content: "Hi" })).toEqual({
      id: "m1",
      role: "assistant",
      parts: [{ type: "text", text: "Hi" }],
    });
    expect(toUIMessage({ id: "m2", role: "user", content: "Q" }).role).toBe("user");
  });
});
