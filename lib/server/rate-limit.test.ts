import { beforeEach, describe, expect, it } from "vitest";

import {
  RATE_LIMIT,
  RATE_WINDOW_MS,
  __resetRateLimitForTests,
  checkRateLimit,
  pruneRateLimitBuckets,
} from "@/lib/server/rate-limit";

beforeEach(() => __resetRateLimitForTests());

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const results = Array.from({ length: RATE_LIMIT }, () =>
      checkRateLimit("1.2.3.4", 1_000),
    );

    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.at(-1)?.remaining).toBe(0);
  });

  it("rejects the request past the limit and reports a retry delay", () => {
    for (let i = 0; i < RATE_LIMIT; i += 1) checkRateLimit("1.2.3.4", 1_000);

    const blocked = checkRateLimit("1.2.3.4", 1_000);

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(RATE_WINDOW_MS / 1000);
  });

  it("keeps separate budgets per client", () => {
    for (let i = 0; i < RATE_LIMIT; i += 1) checkRateLimit("1.1.1.1", 1_000);

    expect(checkRateLimit("1.1.1.1", 1_000).ok).toBe(false);
    expect(checkRateLimit("2.2.2.2", 1_000).ok).toBe(true);
  });

  it("starts a fresh window once the old one expires", () => {
    for (let i = 0; i < RATE_LIMIT; i += 1) checkRateLimit("1.2.3.4", 1_000);
    expect(checkRateLimit("1.2.3.4", 1_000).ok).toBe(false);

    expect(checkRateLimit("1.2.3.4", 1_000 + RATE_WINDOW_MS).ok).toBe(true);
  });
});

describe("pruneRateLimitBuckets", () => {
  it("drops expired buckets so memory does not grow without bound", () => {
    checkRateLimit("old-client", 1_000);
    pruneRateLimitBuckets(1_000 + RATE_WINDOW_MS + 1);

    // A pruned client starts over with a full budget.
    expect(checkRateLimit("old-client", 1_000 + RATE_WINDOW_MS + 1).remaining).toBe(
      RATE_LIMIT - 1,
    );
  });
});
