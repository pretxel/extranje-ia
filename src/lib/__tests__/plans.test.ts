import { describe, expect, it } from "vitest";
import * as chatTypes from "@/lib/chat-types";
import { getLimit, hasReachedLimit, PLAN_LIMITS } from "@/lib/plans";

describe("plans (single source of truth)", () => {
  it("defines limits for free and pro", () => {
    expect(PLAN_LIMITS.free).toBe(5);
    expect(PLAN_LIMITS.pro).toBe(Number.POSITIVE_INFINITY);
  });

  it("getLimit resolves the canonical value", () => {
    expect(getLimit("free")).toBe(5);
    expect(getLimit("pro")).toBe(Number.POSITIVE_INFINITY);
  });

  it("hasReachedLimit only caps finite plans", () => {
    expect(hasReachedLimit("free", 4)).toBe(false);
    expect(hasReachedLimit("free", 5)).toBe(true);
    expect(hasReachedLimit("pro", 9999)).toBe(false);
  });

  it("chat-types no longer re-defines PLAN_LIMITS", () => {
    expect((chatTypes as Record<string, unknown>).PLAN_LIMITS).toBeUndefined();
  });
});
