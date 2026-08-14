"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

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

  /**
   * What we have asked the URL to become, which runs ahead of what it is.
   *
   * Patches merge into this rather than into the rendered `query`, because
   * `router.replace` is asynchronous: a filter picked while a debounced search
   * was still navigating used to merge onto the pre-search query and put the
   * old term back, leaving the URL disagreeing with the search box.
   */
  const requestedRef = useRef(query);
  /** Pushes we have issued and not yet seen commit, oldest first. */
  const inFlightRef = useRef<string[]>([]);

  useEffect(() => {
    const committed = serializeNewsQuery({ ...query, page: 1 }).toString();
    const index = inFlightRef.current.indexOf(committed);

    if (index === -1) {
      // A navigation we did not start — the back button, a link, the command
      // palette. It supersedes whatever we thought was pending.
      requestedRef.current = query;
      inFlightRef.current = [];
      return;
    }

    // One of ours landing. Drop it and anything older; pushes issued after it
    // are still in flight, and `requestedRef` already accounts for them.
    inFlightRef.current = inFlightRef.current.slice(index + 1);
  }, [query]);

  const setParams = useCallback(
    (patch: Partial<FeedParams>) => {
      const merged = { ...requestedRef.current, ...patch, page: 1 };
      requestedRef.current = merged;

      const search = serializeNewsQuery(merged).toString();
      inFlightRef.current = [...inFlightRef.current, search];

      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
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
