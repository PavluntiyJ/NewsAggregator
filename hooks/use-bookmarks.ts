"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { createLocalStore } from "@/lib/local-store";
import type { Article } from "@/lib/types";

const STORAGE_KEY = "news-aggregator:bookmarks:v1";
const MAX_BOOKMARKS = 300;

const EMPTY: Article[] = [];

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

/**
 * Every field is checked, not just the two the feed happens to render first.
 *
 * Persisted data is untrusted input: it outlives the code that wrote it, and a
 * single entry saved by an older build is enough to take the page down. An
 * earlier version accepted anything with an `id` and a `title`, so a partial
 * record reached `ArticleCard`, which reads `article.source.name` — that threw
 * on every render of /bookmarks and kept throwing until localStorage was
 * cleared by hand. Dropping a suspect entry loses one bookmark; accepting it
 * loses the page.
 */
function isArticle(value: unknown): value is Article {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.source !== "object" || candidate.source === null) return false;
  const source = candidate.source as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.publishedAt === "string" &&
    isNullableString(candidate.description) &&
    isNullableString(candidate.image) &&
    typeof source.name === "string" &&
    isNullableString(source.url)
  );
}

/** Exported for its own tests: the store binds it at module scope, which makes
 *  it awkward to exercise through the singleton. */
export function reviveBookmarks(raw: unknown): Article[] {
  if (!Array.isArray(raw)) return EMPTY;
  const articles = raw.filter(isArticle);
  return articles.length > 0 ? articles : EMPTY;
}

export const bookmarksStore = createLocalStore<Article[]>(
  STORAGE_KEY,
  EMPTY,
  reviveBookmarks,
);

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

  /**
   * Idempotent counterpart to `remove`, so an action can be undone without
   * knowing what happened in between.
   *
   * `toggle` is the wrong primitive for Undo: by the time a toast action runs,
   * the user may have re-added the article by hand, and toggling then removes
   * a bookmark they wanted. Adding something already saved is a no-op instead.
   * A revived bookmark returns to the front rather than its old index — Undo
   * restores the article, not the scroll position.
   */
  const add = useCallback((article: Article) => {
    bookmarksStore.update((current) =>
      current.some((a) => a.id === article.id)
        ? current
        : [article, ...current].slice(0, MAX_BOOKMARKS),
    );
  }, []);

  const remove = useCallback((id: string) => {
    bookmarksStore.update((current) => current.filter((a) => a.id !== id));
  }, []);

  /**
   * Puts `articles` back without discarding anything saved since they left.
   *
   * Undo after "Clear all" used to write the removed array straight back over
   * the store, so any bookmark added while the toast was still on screen was
   * destroyed by the undo of an action that predated it.
   *
   * Restored articles go after whatever is already there: they are the older
   * material, and if the merge overflows `MAX_BOOKMARKS` they are the ones that
   * should fall off the end rather than the ones just saved.
   */
  const restore = useCallback((articles: Article[]) => {
    bookmarksStore.update((current) => {
      const known = new Set(current.map((a) => a.id));
      const missing = articles.filter((a) => !known.has(a.id));
      if (missing.length === 0) return current;
      return [...current, ...missing].slice(0, MAX_BOOKMARKS);
    });
  }, []);

  const clear = useCallback(() => bookmarksStore.set(EMPTY), []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return {
    bookmarks,
    has,
    toggle,
    add,
    remove,
    restore,
    clear,
    count: bookmarks.length,
  };
}
