# Decisions

Why the code is the way it is. Each entry records the alternative that was
rejected, because that is the part you cannot recover by reading the source.

If you are about to change something listed here, read the entry first — several
of these look like mistakes until you know what they are avoiding. If you change
one anyway, update its entry in the same commit.

---

## ADR-001 — The browser never talks to the news API

**Decision.** All upstream calls go through `app/api/news/route.ts`. The key is
read server-side only, guarded by `server-only`.

**Rejected.** Calling GNews directly from the client, as v1 did with
`VITE_GNEWS_API_KEY`. Anything a bundler inlines at build time is readable in
devtools; the free tier allows 100 requests per day, so a published key is a
published budget.

**Consequences.** An extra hop, and the app needs a server — it can no longer be
a static export. In exchange we get a place to cache, rate-limit, validate and
map errors, none of which is possible client-side.

---

## ADR-002 — No API key runs the full app against fixtures

**Decision.** With `GNEWS_API_KEY` unset, `lib/server/news-service.ts` serves
`lib/server/fixtures.ts` and marks the response `demo: true`. Search, sorting,
paging and empty results all behave identically to the live path.

**Rejected.** Failing loudly on a missing key, or shipping a throwaway key in the
repo.

**Consequences.** `git clone && npm run dev` works with no signup, and the unit
tests, e2e suite and CI are deterministic, network-free, and never spend the
quota. The cost is that fixtures are now a contract — see
[TESTING.md](TESTING.md).

---

## ADR-003 — The URL owns feed state

**Decision.** Query, sort, language, country and page size live in search params.
`hooks/use-feed-params.ts` is the only reader and writer.

**Rejected.** Holding filters in component state, as v1 did.

**Consequences.** Every view is shareable and the back button is meaningful. It
also structurally removes the v1 bug where the page index survived a new search,
leaving you on page 5 of results you had just replaced.

Page index is deliberately excluded: the infinite feed always starts at page 1,
because a shared link that opens mid-scroll with a gap above it is worse than one
that starts at the top.

---

## ADR-004 — Errors cross the wire as codes

**Decision.** `NewsErrorCode` is a closed union. The server maps every upstream
status onto it; the client switches on the code.

**Rejected.** Passing upstream messages through and pattern-matching them. v1 did
this, and its rate-limit branch checked for a substring that the code setting the
message never produced — so the branch could not run at all. Nothing failed
loudly; it just silently did nothing.

**Consequences.** Adding an upstream failure mode means extending the union and
handling it everywhere the compiler points, instead of hoping a regex still
matches.

---

## ADR-005 — The upstream fetch passes no AbortSignal

**Decision.** `fetchNews` calls `fetch` with `next: { revalidate }` and no signal.

**Rejected.** Passing a timeout signal, which reads as the more careful choice.

**Consequences.** Attaching a signal opts the request out of the Next.js data
cache, and that cache is what keeps the deployment inside the quota (ADR-001).
Losing it to gain a timeout is a bad trade when the platform already bounds
function duration. Client-side cancellation still works — TanStack aborts the
browser-to-`/api/news` request, which is the hop that actually causes stale
renders.

---

## ADR-006 — Rate limiting fails open on unidentifiable callers

**Decision.** `app/api/news/route.ts` skips the limiter entirely when it can read
neither `x-forwarded-for` nor `x-real-ip`.

**Rejected.** Bucketing unknown callers under a shared `"anonymous"` key, which
was the original implementation.

**Consequences.** A shared bucket silently converts a per-client limit into a
global one: behind any proxy that strips forwarding headers, every visitor draws
from the same 60/minute budget and the site throttles itself. This was caught by
the e2e suite, where all tests share one origin and started 429-ing each other.
The upstream quota is protected by the response cache regardless; the limiter
only exists to stop one client walking every cache key.

---

## ADR-007 — `useSyncExternalStore` instead of a state library

**Decision.** Bookmarks, search history and online status use
`lib/local-store.ts` with `useSyncExternalStore`.

**Rejected.** Zustand or Redux, and the common `useState` + `useEffect` hydration
dance.

**Consequences.** No dependency, no hydration mismatch (the server snapshot is
always the fallback), and cross-tab sync comes free from `storage` events. The
constraint it imposes: `getSnapshot` must return a cached reference. Re-parsing
JSON on each call returns a fresh object every time and sends React into an
infinite render loop.

---

## ADR-008 — A hand-written service worker

**Decision.** `public/sw.js` is written by hand, with one strategy per request
kind: network-first for navigations and `/api/news`, cache-first for images.

**Rejected.** A plugin such as Serwist or `next-pwa`.

**Consequences.** Roughly 100 lines to maintain, against a build-time dependency
that would have to track Next.js releases. It also lets news be network-first on
purpose — stale headlines presented as current would be worse than a brief
spinner, which is the opposite of the default a generic plugin gives you.

Registration checks `document.readyState` before falling back to the `load`
event. Waiting unconditionally for `load` means never registering when that event
has already fired, which is the common case.

---

## ADR-009 — Remote images are allowed from any HTTPS host

**Decision.** `next.config.ts` sets `remotePatterns` to `https://**`, with SVG
disabled and `contentDispositionType: "attachment"`.

**Rejected.** Enumerating publisher domains (impossible — the set is open-ended)
or disabling optimisation entirely (loses resizing and modern formats).

**Consequences.** The image optimiser will resize any HTTPS image someone points
it at, so it could be used as a resizing proxy on our quota. Accepted for a
portfolio deployment; the mitigation if this ever mattered is a signed-URL loader
or proxying images through our own route. Do not relax the SVG or disposition
settings — those are what stop the optimiser serving active content.

---

## ADR-011 — Paging is reasoned about in the upstream's terms

**Decision.** `pageSize` is capped at 10 by the schema, and `hasMore` is derived
from how many rows the upstream sent, never from how many survived
normalisation or from how many we asked for.

**Rejected.** The obvious `articles.length === pageSize` test for "was this page
full?".

**Consequences.** That test is wrong in two ways at once, and both silently
truncate the feed rather than failing loudly:

  - The free tier clamps `max` to 10 and *does not error* on a larger value. A
    default `pageSize` of 12 therefore received 10 articles, compared them
    against 12, concluded the results were exhausted, and told the reader
    "That's everything for this search" after the first page. This shipped, and
    was only caught by querying the live deployment during an audit — fixtures
    return exactly what they are asked for, so no test could see it.
  - Dropping a single malformed row made a full page look partial, with the
    same result.

Neither is reachable from demo mode, which is a real limitation of the fixture
strategy in ADR-002: fixtures model the API's contract, not its undocumented
behaviour. Boundary conditions that depend on what the upstream actually does
need to be checked against the upstream.

---

## ADR-010 — Article images fall back to a painted placeholder

**Decision.** `components/article-image.tsx` renders a deterministic low-chroma
gradient plus a glyph when an image is missing or fails to load.

**Rejected.** A placeholder image file, as v1 used.

**Consequences.** Nothing to fetch, so the fallback cannot itself fail — v1's
placeholder was a relative path that broke on nested routes and could loop if the
fallback 404'd. The hue derives from the article id, so a given article always
looks the same and a grid of them stays distinguishable.

---

## ADR-012 — The feed refreshes on request, never on its own

**Decision.** `refetchOnMount` and `refetchOnWindowFocus` are both off. The only
refetch trigger in the app is a Refresh button, wired to `useNewsFeed.refresh()`,
which trims the cached pages to the first one before refetching.

**Rejected.** TanStack's defaults, which refetch a stale query whenever a
component remounts or the window regains focus.

**Consequences.** Automatic refetching is priced per *page*, not per query:
TanStack replays every cached page of an infinite query, so a reader eight pages
deep costs eight upstream requests per trigger against a free tier of a hundred
a day. `maxPages` is the only built-in lever and it works by discarding pages,
which on this UI means already rendered cards vanishing off the top of the grid
mid-scroll. Trimming to page one at the moment the reader asks for fresh news is
both cheaper and more honest about what "refresh" means for a feed — new
articles shift every offset anyway, so replaying old page numbers refetches
positions, not content.

Nobody is stranded on stale headlines by this. The QueryClient is created in
`useState` and never persisted, so a new tab always starts empty and fetches;
within a session the button is the path, and it returns the reader to the top
because the list beneath them has been replaced.

The cost is a tab left open for hours showing hours-old headlines until someone
presses Refresh. That is the trade the quota buys, and it is visible to the
reader rather than silent.
