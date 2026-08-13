import "server-only";

import { DEMO_CORPUS_SIZE, searchFixtures } from "@/lib/server/fixtures";
import { MAX_PAGE, type NewsQuery } from "@/lib/news-query";
import type { Article, NewsErrorCode, NewsPage } from "@/lib/types";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";
const DEFAULT_CACHE_TTL = 300;

export class NewsServiceError extends Error {
  constructor(
    readonly code: NewsErrorCode,
    message: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "NewsServiceError";
  }
}

type GNewsArticle = {
  title?: string;
  description?: string | null;
  url?: string;
  image?: string | null;
  publishedAt?: string;
  source?: { name?: string; url?: string | null } | null;
};

type GNewsResponse = {
  totalArticles?: number;
  articles?: GNewsArticle[];
};

export function isDemoMode(): boolean {
  return !process.env.GNEWS_API_KEY;
}

function cacheTtl(): number {
  const parsed = Number(process.env.NEWS_CACHE_TTL);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_TTL;
}

/**
 * Maps an upstream HTTP status onto our own error vocabulary.
 *
 * The client switches on these codes. v1 pattern-matched substrings of an
 * exception message instead, which is why its 429 branch silently never ran.
 */
function mapUpstreamStatus(status: number, retryAfter?: number): NewsServiceError {
  switch (status) {
    case 400:
      return new NewsServiceError(
        "invalid_request",
        "The news provider rejected the query.",
        400,
      );
    case 401:
      // A bad key is our misconfiguration, never the visitor's fault — and the
      // detail must not leak to the browser.
      return new NewsServiceError(
        "not_configured",
        "The news provider rejected our credentials.",
        502,
      );
    case 403:
      return new NewsServiceError(
        "quota_exceeded",
        "The daily request quota for the news provider is used up. It resets at midnight UTC.",
        503,
      );
    case 429:
      return new NewsServiceError(
        "rate_limited",
        "Too many requests to the news provider. Please wait a moment.",
        429,
        retryAfter,
      );
    default:
      return new NewsServiceError(
        "upstream_unavailable",
        "The news provider is unavailable right now.",
        502,
      );
  }
}

function normalizeArticle(raw: GNewsArticle): Article | null {
  const url = raw.url?.trim();
  const title = raw.title?.trim();
  if (!url || !title) return null;

  return {
    id: url,
    title,
    description: raw.description?.trim() || null,
    url,
    image: raw.image?.trim() || null,
    publishedAt: raw.publishedAt ?? new Date().toISOString(),
    source: {
      name: raw.source?.name?.trim() || new URL(url).hostname.replace(/^www\./, ""),
      url: raw.source?.url?.trim() || null,
    },
  };
}

function paginate(articles: Article[], query: NewsQuery, demo: boolean): NewsPage {
  const start = (query.page - 1) * query.pageSize;
  const slice = articles.slice(start, start + query.pageSize);

  return {
    articles: slice,
    totalArticles: articles.length,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: start + slice.length < articles.length && query.page < MAX_PAGE,
    demo,
  };
}

function serveFixtures(query: NewsQuery): NewsPage {
  const matches = searchFixtures(query.q);

  const sorted =
    query.sort === "publishedAt"
      ? [...matches].sort(
          (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
        )
      : matches;

  return paginate(sorted, query, true);
}

/**
 * Fetches a page of news.
 *
 * Upstream responses are cached for NEWS_CACHE_TTL seconds. That is not an
 * optimisation but a requirement: the free tier allows 100 requests per day
 * across all visitors, so an uncached deployment is exhausted within minutes of
 * being linked anywhere.
 */
export async function fetchNews(query: NewsQuery): Promise<NewsPage> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return serveFixtures(query);

  const url = new URL(GNEWS_ENDPOINT);
  url.searchParams.set("q", query.q);
  url.searchParams.set("lang", query.lang);
  url.searchParams.set("max", String(query.pageSize));
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("sortby", query.sort);
  url.searchParams.set("apikey", apiKey);
  if (query.country !== "any") {
    url.searchParams.set("country", query.country);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      // No AbortSignal here on purpose: passing one opts the request out of the
      // Next.js data cache, and the cache is what keeps us inside the quota.
      next: { revalidate: cacheTtl(), tags: ["news"] },
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new NewsServiceError(
      "upstream_unavailable",
      "Could not reach the news provider.",
      502,
    );
  }

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw mapUpstreamStatus(
      response.status,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }

  let payload: GNewsResponse;
  try {
    payload = (await response.json()) as GNewsResponse;
  } catch {
    throw new NewsServiceError(
      "upstream_unavailable",
      "The news provider returned a malformed response.",
      502,
    );
  }

  const articles = (payload.articles ?? [])
    .map(normalizeArticle)
    .filter((article): article is Article => article !== null);

  const totalArticles = payload.totalArticles ?? articles.length;
  const consumed = (query.page - 1) * query.pageSize + articles.length;

  return {
    articles,
    totalArticles,
    page: query.page,
    pageSize: query.pageSize,
    hasMore:
      articles.length === query.pageSize &&
      consumed < totalArticles &&
      query.page < MAX_PAGE,
    demo: false,
  };
}

export const __testing = { normalizeArticle, mapUpstreamStatus, paginate, DEMO_CORPUS_SIZE };
