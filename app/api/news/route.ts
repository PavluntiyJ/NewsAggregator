import { parseNewsQuery } from "@/lib/news-query";
import {
  NewsServiceError,
  fetchNews,
  isDemoMode,
} from "@/lib/server/news-service";
import { checkRateLimit, pruneRateLimitBuckets } from "@/lib/server/rate-limit";
import type { NewsError } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Identifies the caller for rate-limiting purposes, or null if we cannot.
 *
 * Returning null (and skipping the limit) rather than bucketing unidentified
 * callers under a shared key is deliberate. A shared bucket turns a per-client
 * limit into a global one: behind a proxy that strips these headers, every
 * visitor would draw from the same 60/minute budget and the site would throttle
 * itself. The upstream quota is protected by the response cache regardless;
 * this limiter only exists to stop one client walking every cache key.
 */
function clientKey(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return request.headers.get("x-real-ip")?.trim() || null;
}

function errorResponse(
  code: NewsError["error"]["code"],
  message: string,
  status: number,
  retryAfter?: number,
): Response {
  const body: NewsError = { error: { code, message, ...(retryAfter ? { retryAfter } : {}) } };
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);

  return Response.json(body, { status, headers });
}

export async function GET(request: Request): Promise<Response> {
  pruneRateLimitBuckets();

  const key = clientKey(request);
  const limit = key ? checkRateLimit(key) : null;

  if (limit && !limit.ok) {
    return errorResponse(
      "rate_limited",
      "You are sending requests too quickly. Please slow down.",
      429,
      limit.retryAfter,
    );
  }

  const { searchParams } = new URL(request.url);
  const query = parseNewsQuery(searchParams);

  try {
    const page = await fetchNews(query);

    return Response.json(page, {
      headers: {
        // Short shared-cache window with a long stale window: the CDN can keep
        // serving the previous page while it refreshes in the background, which
        // both hides upstream latency and shields the daily quota.
        "Cache-Control": isDemoMode()
          ? "public, max-age=60"
          : "public, s-maxage=60, stale-while-revalidate=600",
        ...(limit ? { "X-RateLimit-Remaining": String(limit.remaining) } : {}),
      },
    });
  } catch (error) {
    if (error instanceof NewsServiceError) {
      // Log the real cause server-side; the client only sees the mapped code.
      console.error(`[api/news] ${error.code}:`, error.message);
      return errorResponse(error.code, error.message, error.status, error.retryAfter);
    }

    console.error("[api/news] unexpected error:", error);
    return errorResponse(
      "upstream_unavailable",
      "Something went wrong while loading the news.",
      500,
    );
  }
}
