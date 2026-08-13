import { describe, expect, it } from "vitest";

import { dedupeArticles, titleKey } from "@/lib/articles";
import type { Article } from "@/lib/types";

function article(overrides: Partial<Article> & { id: string; title: string }): Article {
  return {
    description: null,
    url: overrides.id,
    image: null,
    publishedAt: "2026-08-13T09:00:00Z",
    source: { name: "Example", url: null },
    ...overrides,
  };
}

const page = (...articles: Article[]) => ({ articles });

describe("titleKey", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(titleKey("AI's Subtle Impact: Ripples")).toBe(
      titleKey("ai s   subtle impact ripples"),
    );
  });

  it("keeps genuinely different headlines apart", () => {
    expect(titleKey("Markets rise")).not.toBe(titleKey("Markets fall"));
  });

  it("handles non-Latin scripts without collapsing everything to empty", () => {
    expect(titleKey("Кванты и рынки")).toBe("кванты и рынки");
  });
});

describe("dedupeArticles", () => {
  it("flattens pages in order", () => {
    const result = dedupeArticles([
      page(article({ id: "a", title: "First" })),
      page(article({ id: "b", title: "Second" })),
    ]);

    expect(result.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("drops a repeated URL across page boundaries", () => {
    const result = dedupeArticles([
      page(article({ id: "a", title: "First" })),
      page(article({ id: "a", title: "First" }), article({ id: "b", title: "Second" })),
    ]);

    expect(result.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("collapses the same story syndicated under different URLs", () => {
    // Wire copy republished by three outlets: distinct URLs, identical headline.
    const result = dedupeArticles([
      page(
        article({ id: "tribune.test/x", title: "Kerala partners with SAS" }),
        article({ id: "ani.test/y", title: "Kerala Partners With SAS" }),
        article({ id: "pti.test/z", title: "Kerala partners with SAS!" }),
        article({ id: "other.test/q", title: "Something else entirely" }),
      ),
    ]);

    expect(result.map((a) => a.id)).toEqual(["tribune.test/x", "other.test/q"]);
  });

  it("keeps the first occurrence, preserving upstream ordering", () => {
    const result = dedupeArticles([
      page(
        article({ id: "first.test", title: "Same headline" }),
        article({ id: "second.test", title: "Same headline" }),
      ),
    ]);

    expect(result[0]?.id).toBe("first.test");
  });

  it("does not collapse articles whose titles normalise to empty", () => {
    const result = dedupeArticles([
      page(article({ id: "a", title: "!!!" }), article({ id: "b", title: "???" })),
    ]);

    expect(result).toHaveLength(2);
  });

  it("returns an empty array for no pages", () => {
    expect(dedupeArticles([])).toEqual([]);
  });
});
