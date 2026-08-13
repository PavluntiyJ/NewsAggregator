"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { createLocalStore } from "@/lib/local-store";
import type { Article } from "@/lib/types";

const STORAGE_KEY = "news-aggregator:bookmarks:v1";
const MAX_BOOKMARKS = 300;

const EMPTY: Article[] = [];

function isArticle(value: unknown): value is Article {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.title === "string";
}

function revive(raw: unknown): Article[] {
  if (!Array.isArray(raw)) return EMPTY;
  const articles = raw.filter(isArticle);
  return articles.length > 0 ? articles : EMPTY;
}

export const bookmarksStore = createLocalStore<Article[]>(STORAGE_KEY, EMPTY, revive);

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    bookmarksStore.subscribe,
    bookmarksStore.getSnapshot,
    bookmarksStore.getServerSnapshot,
  );

  const ids = useMemo(() => new Set(bookmarks.map((a) => a.id)), [bookmarks]);

  const toggle = useCallback((article: Article) => {
    let added = false;

    bookmarksStore.update((current) => {
      const existing = current.findIndex((a) => a.id === article.id);
      if (existing !== -1) {
        return current.filter((a) => a.id !== article.id);
      }
      added = true;
      return [article, ...current].slice(0, MAX_BOOKMARKS);
    });

    return added;
  }, []);

  const remove = useCallback((id: string) => {
    bookmarksStore.update((current) => current.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => bookmarksStore.set(EMPTY), []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { bookmarks, has, toggle, remove, clear, count: bookmarks.length };
}
