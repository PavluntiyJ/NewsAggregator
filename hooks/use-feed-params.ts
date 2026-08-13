"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { parseNewsQuery, serializeNewsQuery, type NewsQuery } from "@/lib/news-query";
import { CATEGORIES, type CategoryId } from "@/lib/types";

export type FeedParams = Omit<NewsQuery, "page">;

/**
 * The URL is the single source of truth for what the feed shows.
 *
 * That makes every view shareable and the back button meaningful, and it
 * removes the class of bug v1 had where the page index lived in component
 * state and silently survived a new search.
 */
export function useFeedParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo(
    () => parseNewsQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setParams = useCallback(
    (patch: Partial<FeedParams>) => {
      const next = serializeNewsQuery({ ...query, ...patch, page: 1 });
      const search = next.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [pathname, query, router],
  );

  /** Which category chip should read as active, if any. */
  const activeCategory = useMemo<CategoryId | null>(() => {
    const match = CATEGORIES.find(
      (category) => category.query.toLowerCase() === query.q.toLowerCase(),
    );
    return match?.id ?? null;
  }, [query.q]);

  return { query, setParams, activeCategory };
}
