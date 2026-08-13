import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/news/route";
import { RATE_LIMIT, __resetRateLimitForTests } from "@/lib/server/rate-limit";
import type { NewsError, NewsPage } from "@/lib/types";

function request(search = "", ip = "10.0.0.1") {
  return new Request(`http://localhost:3000/api/news${search}`, {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  __resetRateLimitForTests();
  delete process.env.GNEWS_API_KEY;
});

afterEach(() => {
  delete process.env.GNEWS_API_KEY;
});

describe("GET /api/news", () => {
  it("returns a page of articles in demo mode", async () => {
    const response = await GET(request());
    const body = (await response.json()) as NewsPage;

    expect(response.status).toBe(200);
    expect(body.demo).toBe(true);
    expect(body.articles.length).toBeGreaterThan(0);
  });

  it("does not let a malformed query take the endpoint down", async () => {
    const response = await GET(request("?page=abc&lang=klingon"));

    expect(response.status).toBe(200);
  });

  it("advertises a cache policy so the CDN can absorb repeat traffic", async () => {
    process.env.GNEWS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ totalArticles: 0, articles: [] }), {
            status: 200,
          }),
      ),
    );

    const response = await GET(request());

    expect(response.headers.get("cache-control")).toContain("s-maxage");
  });

  it("rejects a client that exceeds the rate limit", async () => {
    for (let i = 0; i < RATE_LIMIT; i += 1) await GET(request("", "9.9.9.9"));

    const response = await GET(request("", "9.9.9.9"));
    const body = (await response.json()) as NewsError;

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("rate_limited");
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("does not rate-limit when the client cannot be identified", async () => {
    // A shared bucket for unidentified callers would turn a per-client limit
    // into a global one and let the site throttle itself behind a proxy that
    // strips forwarding headers.
    const anonymous = () => new Request("http://localhost:3000/api/news");

    for (let i = 0; i < RATE_LIMIT + 5; i += 1) {
      const response = await GET(anonymous());
      expect(response.status).toBe(200);
    }
  });

  it("keeps rate limits separate per client", async () => {
    for (let i = 0; i < RATE_LIMIT; i += 1) await GET(request("", "9.9.9.9"));

    const other = await GET(request("", "8.8.8.8"));

    expect(other.status).toBe(200);
  });

  it("translates an upstream failure into a typed error code", async () => {
    process.env.GNEWS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request());
    const body = (await response.json()) as NewsError;

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("rate_limited");
  });

  it("never leaks the API key to the client, even on failure", async () => {
    process.env.GNEWS_API_KEY = "super-secret-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request());
    const text = await response.text();

    expect(text).not.toContain("super-secret-key");
    expect(JSON.parse(text).error.code).toBe("not_configured");
  });

  it("does not cache error responses", async () => {
    process.env.GNEWS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request());

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
