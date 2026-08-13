"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { NewsRequestError, TERMINAL_ERROR_CODES, fetchNewsPage } from "@/lib/api-client";
import type { NewsQuery } from "@/lib/news-query";
import type { Article } from "@/lib/types";

export function newsQueryKey(params: Omit<NewsQuery, "page">) {
  return ["news", params.q, params.sort, params.lang, params.country] as const;
}

export function useNewsFeed(params: Omit<NewsQuery, "page">) {
  const query = useInfiniteQuery({
    queryKey: newsQueryKey(params),
    // TanStack hands us an AbortSignal that it cancels when the key changes, so
    // a superseded search can never overwrite a newer one. v1 had no such guard
    // and could render stale results whenever responses arrived out of order.
    queryFn: ({ pageParam, signal }) =>
      fetchNewsPage({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Retrying a quota or rate-limit failure just burns the budget faster.
      if (
        error instanceof NewsRequestError &&
        TERMINAL_ERROR_CODES.includes(error.code)
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const articles = useMemo<Article[]>(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<string>();
    const flattened: Article[] = [];

    // Upstream can repeat an article across page boundaries; de-duplicate so
    // React keys stay unique.
    for (const page of pages) {
      for (const article of page.articles) {
        if (seen.has(article.id)) continue;
        seen.add(article.id);
        flattened.push(article);
      }
    }

    return flattened;
  }, [query.data]);

  const firstPage = query.data?.pages[0];

  return {
    ...query,
    articles,
    totalArticles: firstPage?.totalArticles ?? 0,
    isDemo: firstPage?.demo ?? false,
  };
}
