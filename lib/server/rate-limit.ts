import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Generous enough for real browsing — an initial load plus several infinite
// scroll pages and a few filter changes all land inside one window.
export const RATE_LIMIT = 60;
export const RATE_WINDOW_MS = 60_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number;
};

/**
 * Best-effort fixed-window limiter, per client IP.
 *
 * Deliberately in-memory: on serverless each instance keeps its own counters,
 * so this bounds abuse from a single client hammering one instance but is not a
 * distributed guarantee. The real protection for the upstream quota is the
 * response cache in news-service.ts; this only stops one visitor from walking
 * every cache key. A shared store (Redis/Upstash) would be the upgrade path.
 */
export function checkRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > RATE_LIMIT) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: RATE_LIMIT - bucket.count, retryAfter: 0 };
}

/** Prevents unbounded growth on a long-lived instance. */
export function pruneRateLimitBuckets(now: number = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function __resetRateLimitForTests(): void {
  buckets.clear();
}
