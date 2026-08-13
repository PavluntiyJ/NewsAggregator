import { serializeNewsQuery, type NewsQuery } from "@/lib/news-query";
import type { NewsError, NewsErrorCode, NewsPage } from "@/lib/types";

export class NewsRequestError extends Error {
  constructor(
    readonly code: NewsErrorCode,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "NewsRequestError";
  }
}

/** Errors where retrying immediately can only make things worse. */
export const TERMINAL_ERROR_CODES: readonly NewsErrorCode[] = [
  "rate_limited",
  "quota_exceeded",
  "not_configured",
  "invalid_request",
];

function isNewsError(value: unknown): value is NewsError {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as NewsError).error;
  return typeof error?.code === "string" && typeof error?.message === "string";
}

export async function fetchNewsPage(
  query: NewsQuery,
  signal?: AbortSignal,
): Promise<NewsPage> {
  const params = serializeNewsQuery(query);
  const response = await fetch(`/api/news?${params.toString()}`, { signal });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (isNewsError(payload)) {
      throw new NewsRequestError(
        payload.error.code,
        payload.error.message,
        payload.error.retryAfter,
      );
    }

    throw new NewsRequestError(
      "upstream_unavailable",
      "Could not load the news feed.",
    );
  }

  return (await response.json()) as NewsPage;
}
