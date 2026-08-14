import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The router is deliberately *not* wired to the search params: `router.replace`
// only records the href, and a test commits it by hand. That is what makes the
// window between "asked to navigate" and "navigation rendered" — where these
// bugs live — reproducible at all.
const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { useFeedParams } from "@/hooks/use-feed-params";

beforeEach(() => {
  nav.search = "";
  nav.replace.mockClear();
});

const lastHref = () => nav.replace.mock.calls.at(-1)?.[0];

describe("useFeedParams", () => {
  it("writes a patch to the URL and drops defaults", () => {
    const { result } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ q: "fusion" }));

    expect(lastHref()).toBe("/?q=fusion");
  });

  it("returns to a bare path when everything is back to defaults", () => {
    nav.search = "q=fusion";
    const { result } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ q: "artificial intelligence" }));

    expect(lastHref()).toBe("/");
  });

  // Regression: patches used to merge into the last *rendered* query. A filter
  // chosen while a debounced search was still navigating merged onto the
  // pre-search query and silently reinstated the old term.
  it("merges a second patch onto the first even before it commits", () => {
    const { result } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ q: "fusion" }));
    act(() => result.current.setParams({ sort: "relevance" }));

    expect(lastHref()).toBe("/?q=fusion&sort=relevance");
  });

  it("keeps a newer in-flight patch when an older one commits", () => {
    const { result, rerender } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ q: "fusion" }));
    act(() => result.current.setParams({ sort: "relevance" }));

    // Only the first navigation lands; the second is still in flight.
    nav.search = "q=fusion";
    rerender();

    act(() => result.current.setParams({ lang: "de" }));

    expect(lastHref()).toBe("/?q=fusion&sort=relevance&lang=de");
  });

  it("adopts a navigation it did not start, discarding stale intent", () => {
    const { result, rerender } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ sort: "relevance" }));

    // The back button, a link, or the command palette moves us elsewhere.
    nav.search = "q=quantum";
    rerender();

    act(() => result.current.setParams({ lang: "de" }));

    expect(lastHref()).toBe("/?q=quantum&lang=de");
  });

  it("resets to page one on every patch", () => {
    nav.search = "q=fusion&page=4";
    const { result } = renderHook(() => useFeedParams());

    act(() => result.current.setParams({ sort: "relevance" }));

    expect(lastHref()).not.toContain("page=");
  });

  it("marks the category whose query matches the current one", () => {
    nav.search = "q=technology";
    const { result } = renderHook(() => useFeedParams());

    expect(result.current.activeCategory).toBe("tech");
  });

  it("reports no active category for a free-text search", () => {
    nav.search = "q=fusion";
    const { result } = renderHook(() => useFeedParams());

    expect(result.current.activeCategory).toBeNull();
  });
});
