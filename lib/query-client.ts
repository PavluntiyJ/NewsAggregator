import { QueryClient } from "@tanstack/react-query";

/**
 * One QueryClient per browser session, created in state by Providers so it is
 * never shared between SSR requests.
 *
 * Neither automatic refetch trigger is enabled, and the reason is the same for
 * both: an infinite query refetches *every cached page*, so one trigger costs
 * as many upstream requests as the reader has scrolled pages — against a free
 * tier of 100 a day. `useNewsFeed`'s `refresh()` exists precisely because the
 * built-in triggers cannot be told "just the first page".
 *
 * That leaves nobody stranded on stale headlines. The cache is not persisted,
 * so a new tab always starts empty and fetches; within a session the explicit
 * Refresh control in the feed is the path to fresh news, and it collapses the
 * feed back to page one on the way.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  });
}
