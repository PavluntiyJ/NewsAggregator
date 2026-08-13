"use client";

import { AlertTriangle, Loader2, RefreshCw, SearchX } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { ArticleCard, ArticleCardSkeleton } from "@/components/article-card";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { useFeedParams } from "@/hooks/use-feed-params";
import { useNewsFeed } from "@/hooks/use-news-feed";
import { NewsRequestError, TERMINAL_ERROR_CODES } from "@/lib/api-client";

const SKELETON_COUNT = 6;

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <ArticleCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function NewsFeed() {
  const { query } = useFeedParams();
  const {
    articles,
    isDemo,
    error,
    status,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useNewsFeed(query);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Prefetch the next page as the sentinel approaches the viewport. rootMargin
  // gives us a screenful of lead time so the grid rarely shows a gap.
  const canLoadMore = hasNextPage && !isFetchingNextPage && status === "success";

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, fetchNextPage]);

  const retry = useCallback(() => void refetch(), [refetch]);

  const isTerminalError =
    error instanceof NewsRequestError && TERMINAL_ERROR_CODES.includes(error.code);

  return (
    <div className="flex flex-col gap-8">
      <FilterBar />

      {isDemo ? (
        <p className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <strong className="font-semibold">Demo mode.</strong> No{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs">
            GNEWS_API_KEY
          </code>{" "}
          is configured, so these articles come from local fixtures. Everything
          else — search, filters, paging, bookmarks — behaves exactly as it does
          against the live API.
        </p>
      ) : null}

      {/* Announce feed state changes to assistive technology without stealing focus. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status === "pending"
          ? "Loading news"
          : status === "error"
            ? "Failed to load news"
            : `${articles.length} articles loaded`}
      </p>

      {status === "pending" ? <FeedSkeleton /> : null}

      {status === "error" ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center">
          <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Could not load the feed</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Something went wrong. Please try again."}
            </p>
          </div>
          {/* A retry that cannot succeed is worse than no button, so quota and
              rate-limit failures don't offer one. */}
          {isTerminalError ? null : (
            <Button onClick={retry} disabled={isRefetching}>
              {isRefetching ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              Try again
            </Button>
          )}
        </div>
      ) : null}

      {status === "success" && articles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold">
            Nothing found for “{query.q}”
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a broader phrase, a different language, or pick one of the
            categories above.
          </p>
        </div>
      ) : null}

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              // Only the first row is above the fold; everything else lazy-loads.
              priority={index < 3}
            />
          ))}
        </div>
      ) : null}

      {isFetchingNextPage ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <ArticleCardSkeleton key={`next-${index}`} />
          ))}
        </div>
      ) : null}

      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      {status === "success" && articles.length > 0 && !hasNextPage ? (
        <p className="pb-4 text-center text-sm text-muted-foreground">
          That’s everything for this search.
        </p>
      ) : null}
    </div>
  );
}
