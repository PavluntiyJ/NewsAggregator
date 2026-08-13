export type Article = {
  /** Stable identity derived from the article URL — used as the React key and
   *  as the bookmark primary key. v1 used the array index, which made React
   *  reuse the wrong DOM nodes across pagination. */
  id: string;
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string | null };
};

export type NewsPage = {
  articles: Article[];
  totalArticles: number;
  page: number;
  pageSize: number;
  /** True when another page can be requested. Computed server-side so the
   *  client never has to know about upstream paging limits. */
  hasMore: boolean;
  /** Set when the response was served from fixtures instead of the real API. */
  demo: boolean;
};

export type NewsErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "quota_exceeded"
  | "upstream_unavailable"
  | "not_configured";

export type NewsError = {
  error: {
    code: NewsErrorCode;
    message: string;
    /** Seconds to wait before retrying, when the upstream told us. */
    retryAfter?: number;
  };
};

export const SORT_OPTIONS = ["publishedAt", "relevance"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const LANGUAGES = ["en", "de", "fr", "es", "it", "ru", "pt"] as const;
export type Language = (typeof LANGUAGES)[number];

export const COUNTRIES = ["any", "us", "gb", "de", "fr", "es", "it", "ca", "au"] as const;
export type Country = (typeof COUNTRIES)[number];

export const CATEGORIES = [
  { id: "ai", label: "AI", query: "artificial intelligence" },
  { id: "tech", label: "Tech", query: "technology" },
  { id: "science", label: "Science", query: "science" },
  { id: "business", label: "Business", query: "business" },
  { id: "health", label: "Health", query: "health" },
  { id: "world", label: "World", query: "world news" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const DEFAULT_QUERY = "artificial intelligence";
