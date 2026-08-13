import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseNewsQuery } from "@/lib/news-query";
import { NewsServiceError, fetchNews } from "@/lib/server/news-service";

const query = (search = "") => parseNewsQuery(new URLSearchParams(search));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const UPSTREAM_ARTICLE = {
  title: "A headline",
  description: "A description",
  url: "https://example.com/a",
  image: "https://example.com/a.jpg",
  publishedAt: "2026-08-13T09:00:00Z",
  source: { name: "Example", url: "https://example.com" },
};

describe("fetchNews in demo mode", () => {
  beforeEach(() => {
    delete process.env.GNEWS_API_KEY;
  });

  it("serves fixtures and flags the response as demo", async () => {
    const page = await fetchNews(query());

    expect(page.demo).toBe(true);
    expect(page.articles.length).toBeGreaterThan(0);
    expect(page.page).toBe(1);
  });

  it("never calls the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await fetchNews(query());

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("paginates without repeating articles across pages", async () => {
    const first = await fetchNews(query("pageSize=5&page=1"));
    const second = await fetchNews(query("pageSize=5&page=2"));

    const overlap = first.articles.filter((a) =>
      second.articles.some((b) => b.id === a.id),
    );

    expect(first.articles).toHaveLength(5);
    expect(overlap).toHaveLength(0);
    expect(first.hasMore).toBe(true);
  });

  it("returns an empty page for a query nothing matches", async () => {
    const page = await fetchNews(query("q=zzzznomatchzzzz"));

    expect(page.articles).toHaveLength(0);
    expect(page.hasMore).toBe(false);
  });

  it("sorts newest first when asked to", async () => {
    const page = await fetchNews(query("sort=publishedAt"));
    const timestamps = page.articles.map((a) => Date.parse(a.publishedAt));

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });
});

describe("fetchNews against the upstream API", () => {
  beforeEach(() => {
    process.env.GNEWS_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.GNEWS_API_KEY;
  });

  it("normalizes the upstream payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ totalArticles: 1, articles: [UPSTREAM_ARTICLE] }),
      ),
    );

    const page = await fetchNews(query());

    expect(page.demo).toBe(false);
    expect(page.articles[0]).toMatchObject({
      id: "https://example.com/a",
      title: "A headline",
      source: { name: "Example" },
    });
  });

  it("sends the API key on the upstream request", async () => {
    let requestedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        requestedUrl = String(input);
        return jsonResponse({ totalArticles: 0, articles: [] });
      }),
    );

    await fetchNews(query());

    expect(new URL(requestedUrl).searchParams.get("apikey")).toBe("test-key");
  });

  it("drops malformed articles instead of rendering blanks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          totalArticles: 3,
          articles: [UPSTREAM_ARTICLE, { title: "No URL" }, { url: "https://x.test/b" }],
        }),
      ),
    );

    const page = await fetchNews(query());

    expect(page.articles).toHaveLength(1);
  });

  it("falls back to the hostname when the source name is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          totalArticles: 1,
          articles: [{ ...UPSTREAM_ARTICLE, source: null, url: "https://www.bbc.co.uk/x" }],
        }),
      ),
    );

    const page = await fetchNews(query());

    expect(page.articles[0]?.source.name).toBe("bbc.co.uk");
  });

  it.each([
    [429, "rate_limited"],
    [403, "quota_exceeded"],
    [401, "not_configured"],
    [500, "upstream_unavailable"],
    [400, "invalid_request"],
  ])("maps upstream %i onto the %s code", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status })));

    await expect(fetchNews(query())).rejects.toMatchObject({ code });
  });

  it("passes the Retry-After hint through on a 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("", { status: 429, headers: { "retry-after": "42" } }),
      ),
    );

    await expect(fetchNews(query())).rejects.toMatchObject({
      code: "rate_limited",
      retryAfter: 42,
    });
  });

  it("reports a network failure as an upstream problem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    await expect(fetchNews(query())).rejects.toBeInstanceOf(NewsServiceError);
  });

  it("survives a malformed JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 200 })),
    );

    await expect(fetchNews(query())).rejects.toMatchObject({
      code: "upstream_unavailable",
    });
  });

  it("stops paging once the upstream total is consumed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ totalArticles: 1, articles: [UPSTREAM_ARTICLE] }),
      ),
    );

    const page = await fetchNews(query("pageSize=10"));

    expect(page.hasMore).toBe(false);
  });

  it("keeps paging when a row is dropped by normalization", async () => {
    // Regression: hasMore used to compare the normalized article count against
    // the requested pageSize, so a single malformed row made a full page look
    // partial and silently ended the feed.
    const rows = [
      ...Array.from({ length: 9 }, (_, i) => ({
        ...UPSTREAM_ARTICLE,
        url: `https://example.com/a${i}`,
      })),
      { title: "No URL, will be dropped" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ totalArticles: 50, articles: rows })),
    );

    const page = await fetchNews(query("pageSize=10"));

    expect(page.articles).toHaveLength(9);
    expect(page.hasMore).toBe(true);
  });

  it("keeps paging when upstream returns fewer articles than requested", async () => {
    // Regression: the GNews free tier clamps `max` to 10 without erroring, so
    // requesting more used to make every first page look like the last one.
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...UPSTREAM_ARTICLE,
      url: `https://example.com/b${i}`,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ totalArticles: 500, articles: rows })),
    );

    const page = await fetchNews(query("pageSize=10"));

    expect(page.articles).toHaveLength(10);
    expect(page.hasMore).toBe(true);
  });

  it("ends the feed quietly when paging is refused past page one", async () => {
    // The free plan refuses the `page` parameter with a 429. Surfacing that as
    // an error would replace a working screen of articles with a red banner the
    // moment the reader scrolls.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const page = await fetchNews(query("page=2"));

    expect(page.articles).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("still surfaces a rate limit on the first page", async () => {
    // Page one is different: there is nothing on screen to preserve, so the
    // reader has to be told why.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));

    await expect(fetchNews(query("page=1"))).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("stops paging when upstream returns nothing at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ totalArticles: 500, articles: [] })),
    );

    const page = await fetchNews(query("page=3&pageSize=10"));

    expect(page.hasMore).toBe(false);
  });
});
