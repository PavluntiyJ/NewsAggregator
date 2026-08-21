"use client";

import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { NewsRequestError, TERMINAL_ERROR_CODES, fetchNewsPage } from "@/lib/api-client";
import { dedupeArticles } from "@/lib/articles";
import type { NewsQuery } from "@/lib/news-query";
import type { Article, NewsPage } from "@/lib/types";

export function newsQueryKey(params: Omit<NewsQuery, "page">) {
  // pageSize belongs here: pages are cached per key, and a feed fetched with a
  // different pageSize is a different sequence of pages. Leaving it out meant
  // toggling the page size silently reused another size's cached pages.
  return [
    "news",
    params.q,
    params.sort,
    params.lang,
    params.country,
    params.pageSize,
  ] as const;
}

export function useNewsFeed(params: Omit<NewsQuery, "page">) {
  const queryClient = useQueryClient();

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

  const { refetch } = query;

  /**
   * Fresh headlines for one upstream request, whatever the scroll depth.
   *
   * `refetch()` on an infinite query replays every cached page in sequence —
   * eight pages deep means eight requests against a 100/day budget, and eight
   * pages of *old* offsets at that, since new articles shift everything down.
   * TanStack's only built-in lever is `maxPages`, which would drop already
   * rendered cards off the top of the grid mid-scroll. So the pages are
   * trimmed to the first one here and then refetched: exactly what "refresh"
   * means for a news feed, and what the reader sees is the newest page.
   */
  const refresh = useCallback(() => {
    queryClient.setQueryData<InfiniteData<NewsPage, number>>(
      newsQueryKey(params),
      (data) =>
        data && data.pages.length > 1
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
    );
    return refetch();
  }, [params, queryClient, refetch]);

  const articles = useMemo<Article[]>(
    () => dedupeArticles(query.data?.pages ?? []),
    [query.data],
  );

  const firstPage = query.data?.pages[0];

  return {
    ...query,
    articles,
    refresh,
    totalArticles: firstPage?.totalArticles ?? 0,
    isDemo: firstPage?.demo ?? false,
  };
}
