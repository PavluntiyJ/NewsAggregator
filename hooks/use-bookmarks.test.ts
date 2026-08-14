import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { bookmarksStore, reviveBookmarks, useBookmarks } from "@/hooks/use-bookmarks";
import type { Article } from "@/lib/types";

function article(id: string): Article {
  return {
    id,
    title: `Story ${id}`,
    description: null,
    url: `https://example.com/${id}`,
    image: null,
    publishedAt: "2026-08-14T10:00:00Z",
    source: { name: "Example", url: null },
  };
}

// The store is a module singleton, so each test starts from a known state.
beforeEach(() => bookmarksStore.set([]));

describe("reviveBookmarks", () => {
  it("accepts a complete article", () => {
    expect(reviveBookmarks([article("a")])).toEqual([article("a")]);
  });

  // Regression: revival used to check only `id` and `title`, so a truncated
  // entry survived into `ArticleCard`, which reads `article.source.name`. That
  // threw on every render of /bookmarks, and reloading could not fix it —
  // the offending record was read back from localStorage each time.
  it("rejects an entry missing the fields the card renders", () => {
    expect(reviveBookmarks([{ id: "x", title: "x" }])).toEqual([]);
  });

  it("rejects an entry whose source is not an object", () => {
    expect(reviveBookmarks([{ ...article("a"), source: null }])).toEqual([]);
    expect(reviveBookmarks([{ ...article("a"), source: "Example" }])).toEqual([]);
  });

  it("rejects an entry whose source is missing a name", () => {
    expect(reviveBookmarks([{ ...article("a"), source: { url: null } }])).toEqual([]);
  });

  it("rejects a nullable field holding the wrong type", () => {
    expect(reviveBookmarks([{ ...article("a"), description: 42 }])).toEqual([]);
    expect(reviveBookmarks([{ ...article("a"), image: {} }])).toEqual([]);
  });

  it("keeps the valid entries and drops only the broken ones", () => {
    const revived = reviveBookmarks([article("a"), { id: "b", title: "b" }, article("c")]);

    expect(revived.map((a) => a.id)).toEqual(["a", "c"]);
  });

  it("falls back for a payload that is not an array", () => {
    expect(reviveBookmarks({ id: "a" })).toEqual([]);
    expect(reviveBookmarks(null)).toEqual([]);
  });
});

describe("useBookmarks undo primitives", () => {
  it("add is a no-op when the article is already saved", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => void result.current.add(article("a")));
    act(() => void result.current.add(article("a")));

    expect(result.current.bookmarks.map((a) => a.id)).toEqual(["a"]);
  });

  it("remove is a no-op when the article is already gone", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => void result.current.add(article("a")));
    act(() => void result.current.remove("a"));

    expect(() => act(() => void result.current.remove("a"))).not.toThrow();
    expect(result.current.bookmarks).toEqual([]);
  });

  // Regression: Undo used to call `toggle` again. Removing an article, re-adding
  // it by hand, then pressing the still-visible Undo toggled it back off and
  // destroyed a bookmark the user had deliberately re-created.
  it("undoing a removal does not delete an article re-added since", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => void result.current.add(article("a")));
    act(() => void result.current.remove("a")); // the action being undone
    act(() => void result.current.add(article("a"))); // user re-adds by hand
    act(() => void result.current.add(article("a"))); // stale Undo fires

    expect(result.current.bookmarks.map((a) => a.id)).toEqual(["a"]);
  });

  // Regression: Undo after "Clear all" wrote the removed array straight back
  // over the store, wiping anything bookmarked while the toast was up.
  it("restore merges instead of overwriting newer bookmarks", () => {
    const { result } = renderHook(() => useBookmarks());
    const removed = [article("a"), article("b")];

    act(() => void result.current.restore(removed)); // seed
    act(() => void result.current.clear());
    act(() => void result.current.add(article("new"))); // saved after the clear
    act(() => void result.current.restore(removed)); // Undo

    expect(result.current.bookmarks.map((a) => a.id).sort()).toEqual(["a", "b", "new"]);
  });

  it("restore does not duplicate articles that are already present", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => void result.current.add(article("a")));
    act(() => void result.current.restore([article("a"), article("b")]));

    expect(result.current.bookmarks.map((a) => a.id).sort()).toEqual(["a", "b"]);
  });
});
