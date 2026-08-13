"use client";

import { useCallback, useSyncExternalStore } from "react";

import { createLocalStore } from "@/lib/local-store";

const STORAGE_KEY = "news-aggregator:search-history:v1";
const MAX_ENTRIES = 8;

const EMPTY: string[] = [];

function revive(raw: unknown): string[] {
  if (!Array.isArray(raw)) return EMPTY;
  const entries = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_ENTRIES);
  return entries.length > 0 ? entries : EMPTY;
}

export const searchHistoryStore = createLocalStore<string[]>(
  STORAGE_KEY,
  EMPTY,
  revive,
);

export function useSearchHistory() {
  const history = useSyncExternalStore(
    searchHistoryStore.subscribe,
    searchHistoryStore.getSnapshot,
    searchHistoryStore.getServerSnapshot,
  );

  const record = useCallback((rawTerm: string) => {
    const term = rawTerm.trim();
    if (!term) return;

    searchHistoryStore.update((current) => {
      // Case-insensitive dedupe, most recent first.
      const withoutDuplicate = current.filter(
        (entry) => entry.toLowerCase() !== term.toLowerCase(),
      );
      return [term, ...withoutDuplicate].slice(0, MAX_ENTRIES);
    });
  }, []);

  const remove = useCallback((term: string) => {
    searchHistoryStore.update((current) =>
      current.filter((entry) => entry !== term),
    );
  }, []);

  const clear = useCallback(() => searchHistoryStore.set(EMPTY), []);

  return { history, record, remove, clear };
}
