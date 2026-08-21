import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchNewsPage: vi.fn() }));

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  fetchNewsPage: api.fetchNewsPage,
}));

import { newsQueryKey, useNewsFeed } from "@/hooks/use-news-feed";
import { createQueryClient } from "@/lib/query-client";
import type { NewsPage } from "@/lib/types";

const PARAMS = {
  q: "fusion",
  pageSize: 10,
  sort: "publishedAt",
  lang: "en",
  country: "any",
} as const;

/** A page whose article titles say which page and which fetch produced them. */
function page(number: number, batch = "a"): NewsPage {
  return {
    articles: [
      {
        id: `p${number}-${batch}`,
        title: `page ${number} (${batch})`,
        description: null,
        url: `https://example.test/${batch}/${number}`,
        image: null,
        publishedAt: "2026-08-21T09:00:00.000Z",
        source: { name: "Example", url: null },
      },
    ],
    totalArticles: 40,
    page: number,
    pageSize: 10,
    hasMore: number < 4,
    demo: false,
  };
}

/** A provider bound to one client, so a test can share it across remounts. */
function providerFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

const wrapper = () => providerFor(createQueryClient());

beforeEach(() => {
  api.fetchNewsPage.mockReset();
  api.fetchNewsPage.mockImplementation(({ page: n }: { page: number }) =>
    Promise.resolve(page(n)),
  );
});

describe("newsQueryKey", () => {
  // Regression: pageSize used to be absent, so switching sizes reused another
  // size's cached pages instead of fetching a differently-shaped feed.
  it("separates feeds that differ only by pageSize", () => {
    expect(newsQueryKey({ ...PARAMS, pageSize: 10 })).not.toEqual(
      newsQueryKey({ ...PARAMS, pageSize: 20 }),
    );
  });

  it("keys identical queries the same", () => {
    expect(newsQueryKey({ ...PARAMS })).toEqual(newsQueryKey({ ...PARAMS }));
  });
});

describe("useNewsFeed", () => {
  it("accumulates pages as they are fetched", async () => {
    const { result } = renderHook(() => useNewsFeed(PARAMS), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.status).toBe("success"));
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.articles).toHaveLength(2));

    expect(result.current.articles.map((a) => a.title)).toEqual([
      "page 1 (a)",
      "page 2 (a)",
    ]);
  });

  // The point of `refresh` over a bare `refetch`: TanStack replays every cached
  // page, so a reader four pages deep would spend four upstream requests — and
  // four stale offsets — to see today's headlines.
  it("refreshes a deep feed with a single request", async () => {
    const { result } = renderHook(() => useNewsFeed(PARAMS), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.status).toBe("success"));
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.articles).toHaveLength(3));

    api.fetchNewsPage.mockClear();
    api.fetchNewsPage.mockImplementation(({ page: n }: { page: number }) =>
      Promise.resolve(page(n, "b")),
    );

    await result.current.refresh();

    expect(api.fetchNewsPage).toHaveBeenCalledTimes(1);
    expect(api.fetchNewsPage.mock.calls.at(0)?.[0]).toMatchObject({ page: 1 });
  });

  it("collapses the feed to the newest first page on refresh", async () => {
    const { result } = renderHook(() => useNewsFeed(PARAMS), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.status).toBe("success"));
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.articles).toHaveLength(2));

    api.fetchNewsPage.mockImplementation(({ page: n }: { page: number }) =>
      Promise.resolve(page(n, "b")),
    );
    await result.current.refresh();

    await waitFor(() =>
      expect(result.current.articles.map((a) => a.title)).toEqual(["page 1 (b)"]),
    );
    // Still pageable afterwards — refresh restarts the feed, it does not end it.
    expect(result.current.hasNextPage).toBe(true);
  });

  it("does not refetch a cached feed when the component remounts", async () => {
    const withClient = providerFor(createQueryClient());

    const first = renderHook(() => useNewsFeed(PARAMS), { wrapper: withClient });
    await waitFor(() => expect(first.result.current.status).toBe("success"));
    first.unmount();

    api.fetchNewsPage.mockClear();
    const second = renderHook(() => useNewsFeed(PARAMS), { wrapper: withClient });
    await waitFor(() => expect(second.result.current.status).toBe("success"));

    expect(api.fetchNewsPage).not.toHaveBeenCalled();
  });
});
