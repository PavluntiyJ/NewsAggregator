import { describe, expect, it } from "vitest";

import { MAX_PAGE, parseNewsQuery, serializeNewsQuery } from "@/lib/news-query";
import { DEFAULT_QUERY } from "@/lib/types";

function parse(search: string) {
  return parseNewsQuery(new URLSearchParams(search));
}

describe("parseNewsQuery", () => {
  it("applies defaults for an empty query string", () => {
    expect(parse("")).toEqual({
      q: DEFAULT_QUERY,
      page: 1,
      pageSize: 12,
      sort: "publishedAt",
      lang: "en",
      country: "any",
    });
  });

  it("reads valid values", () => {
    expect(parse("q=quantum&page=3&pageSize=20&sort=relevance&lang=de&country=us")).toEqual({
      q: "quantum",
      page: 3,
      pageSize: 20,
      sort: "relevance",
      lang: "de",
      country: "us",
    });
  });

  it("falls back instead of throwing on malformed input", () => {
    // A stale bookmark must still render news rather than an error page.
    const query = parse("page=not-a-number&sort=sideways&lang=klingon&country=mars");

    expect(query.page).toBe(1);
    expect(query.sort).toBe("publishedAt");
    expect(query.lang).toBe("en");
    expect(query.country).toBe("any");
  });

  it("clamps paging to the upstream limit", () => {
    expect(parse(`page=${MAX_PAGE + 50}`).page).toBe(1);
    expect(parse("pageSize=9999").pageSize).toBe(12);
  });

  it("trims whitespace and rejects an empty search term", () => {
    expect(parse("q=%20%20").q).toBe(DEFAULT_QUERY);
    expect(parse("q=%20space%20").q).toBe("space");
  });
});

describe("serializeNewsQuery", () => {
  it("omits values that match the defaults", () => {
    const params = serializeNewsQuery({
      q: DEFAULT_QUERY,
      page: 1,
      pageSize: 12,
      sort: "publishedAt",
      lang: "en",
      country: "any",
    });

    expect(params.toString()).toBe("");
  });

  it("keeps values that differ from the defaults", () => {
    const params = serializeNewsQuery({ q: "quantum", sort: "relevance", lang: "en" });

    expect(params.get("q")).toBe("quantum");
    expect(params.get("sort")).toBe("relevance");
    expect(params.get("lang")).toBeNull();
  });

  it("round-trips through parseNewsQuery", () => {
    const original = parse("q=fusion&sort=relevance&lang=fr&country=ca&pageSize=20");
    const restored = parseNewsQuery(serializeNewsQuery(original));

    expect(restored).toEqual(original);
  });
});
