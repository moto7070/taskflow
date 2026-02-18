import { describe, expect, it, vi } from "vitest";

import { consumeRateLimit } from "@/lib/server/rate-limit";

describe("consumeRateLimit", () => {
  it("allows requests under limit and blocks when exceeded", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const userId = `user-${Date.now()}`;

    const first = consumeRateLimit({
      scope: "test:scope",
      userId,
      request,
      limit: 2,
      windowMs: 60_000,
    });
    const second = consumeRateLimit({
      scope: "test:scope",
      userId,
      request,
      limit: 2,
      windowMs: 60_000,
    });
    const third = consumeRateLimit({
      scope: "test:scope",
      userId,
      request,
      limit: 2,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "198.51.100.15" },
    });
    const userId = `user-reset-${Date.now()}`;

    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const first = consumeRateLimit({
      scope: "test:window",
      userId,
      request,
      limit: 1,
      windowMs: 1_000,
    });
    const blocked = consumeRateLimit({
      scope: "test:window",
      userId,
      request,
      limit: 1,
      windowMs: 1_000,
    });
    vi.setSystemTime(now + 1_500);
    const afterReset = consumeRateLimit({
      scope: "test:window",
      userId,
      request,
      limit: 1,
      windowMs: 1_000,
    });

    vi.useRealTimers();

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(afterReset.allowed).toBe(true);
  });
});
