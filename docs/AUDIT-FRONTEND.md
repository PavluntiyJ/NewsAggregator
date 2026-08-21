# Frontend audit — UI/UX and performance

A second pass over the client tree (`components/`, `hooks/`, the client side of
`lib/`, `app/`), through three lenses: does the UI behave, does it read well,
and does it stay fast as the feed grows. The backend/correctness audit lives in
[AUDIT.md](AUDIT.md); its open items are not restated here. Where a finding
overlaps one of that audit's numbers, it is cross-referenced instead.

Every finding below was verified against the source, and each says why the
suite as it then stood — 113 unit tests and 26 e2e scenarios — did not catch it.

All fourteen are now closed. Each fix landed with the test whose absence the
finding named, which is why the suite is larger than the numbers quoted above.
Two of the fixes were themselves wrong on first writing and are recorded at the
bottom under [Corrections](#corrections-made-while-fixing); F1 was rewritten
against a different diagnosis than the one below.

## Status

| # | Severity | Area | Finding | Status |
|---|---|---|---|---|
| F1 | high | perf / UX | The feed never refreshes within a session, and there is no refresh affordance | fixed — see correction |
| F2 | medium | UI | Two clear buttons on the search box in Chromium/Safari (native + custom) | fixed |
| F3 | medium | UX / data | Clearing search by keyboard writes "artificial intelligence" into search history | fixed |
| F4 | medium | perf | Every card re-renders on every feed-state flip; grid reconciliation grows with feed length | fixed |
| F5 | medium | a11y | Mutually exclusive dropdown options are announced as independent checkboxes | fixed |
| F6 | medium | PWA | No apple-touch-icon; SVG-only manifest entries; install claim overstated on iOS | fixed |
| F7 | med-low | storage | `DATA_CACHE` is the only unbounded service-worker cache | fixed |
| F8 | low | perf | `Intl` formatters constructed per call, per card, per render | fixed |
| F9 | low | UX | No way to reset filters once set | fixed — see correction |
| F10 | low | UX copy | Offline banner promises cached articles the app may not have | fixed |
| F11 | low | SEO | `summary_large_image` twitter card with no image asset anywhere | fixed |
| F12 | low | polish | `/bookmarks` never sets the document title | fixed |
| F13 | low | perf | Command palette ships in the initial bundle for every visitor | fixed — net bundle up, see correction |
| F14 | low | UX judgment | A new search keeps the previous scroll offset | decided — scroll to top |

---

## F1 — The feed never refreshes within a session (high)

`app/providers.tsx:19-23` sets both `refetchOnWindowFocus: false` and
`refetchOnMount: false`. The retry button exists only in the error branch
(`components/news-feed.tsx:107`). Together that leaves exactly one fetch
trigger: a query-key change. A user who opens the app, reads, wanders off, and
comes back tomorrow sees yesterday's headlines — rendered confidently, with
relative timestamps frozen at whatever moment they were last computed — and no
control anywhere to refresh. For a *news* product this is the most visible gap
in the client.

The quota rationale for the hard block is already carried by layers the client
does not need to duplicate: the route sets
`s-maxage=60, stale-while-revalidate=600` (`app/api/news/route.ts:68-70`) and
the Next data cache holds 300s. A mount-refetch of a stale query is absorbed by
the CDN without touching upstream. The comment at `providers.tsx:20-21`
("refetching on every remount would spend it on nothing") describes budget the
server already protects.

**Why the tests missed it.** Playwright boots a fresh context per scenario, so
no e2e test ever *has* an old session; unit tests assert fetch behaviour per key
change, never staleness over wall-clock time.

**Fix direction.** Re-enable refetch-on-mount for stale queries (TanStack's
default) or add an explicit refresh control in the success state. Keep the
terminal-error retry guard.

## F2 — Two clear buttons on the search box (medium)

The input is `type="search"` (`components/filter-bar.tsx:89`). Blink and WebKit
render their own native cancel button (`::-webkit-search-cancel-button`)
whenever the field has text — directly under the custom ✕ at `right-2`
(`filter-bar.tsx:107-121`). On the most common browsers the control shows two
overlapping clear affordances. Worse, the native one fires an `input` event,
which routes through `pushQuery("")` and so hits F3 on its way past.

**Why the tests missed it.** jsdom renders no UA shadow UI; the e2e specs assert
behaviour and URLs, not pixels.

**Fix direction.** `[&::-webkit-search-cancel-button]:hidden` on the input, or
drop the custom button and keep the native one (then handle the history
pollution separately).

## F3 — Keyboard-clear pollutes search history with the default term (medium)

`pushQuery` falls back to `DEFAULT_QUERY` when the trimmed term is empty
(`filter-bar.tsx:53-58`) and then unconditionally calls `record(trimmed)`.
Backspacing a search down to empty therefore records "artificial intelligence"
as a recent search the user never made — after which it sits in the datalist and
the command palette's recents indefinitely. The dedicated clear button avoids
this only because it bypasses `pushQuery` entirely (`filter-bar.tsx:112-117`);
the native cancel from F2 and plain backspacing do not.

**Why the tests missed it.** `e2e/feed.spec.ts:44-57` clears via the button;
no test backspaces to empty and inspects the datalist or palette afterwards.

**Fix direction.** Don't record the default fallback; record only terms the user
actually typed (`next.trim() && record(...)`), or skip recording when the
serialised URL drops `q`.

## F4 — Whole-grid re-render per feed-state flip (medium)

`ArticleCard` is not memoised, and `articles` gets a fresh array identity
whenever any page resolves (`hooks/use-news-feed.ts:39-42`). One page-load then
re-renders every accumulated card roughly three times: pending→success, the
append itself, and both flips of `isFetchingNextPage` which toggle a sibling
skeleton block (`components/news-feed.tsx:146-152`). Each card render also runs
`formatRelativeTime` and `hueFromString` again (see F8). At ten cards this is
invisible; at two hundred cards on a mid-range phone it is real main-thread work
on every infinite-scroll step, exactly where jank is most noticeable.

Article object references persist across pages (pages are cached, not rebuilt),
so props are already stable enough for `React.memo`.

**Why the tests missed it.** Fixtures are tiny and fast; assertions count
articles, not frames.

**Fix direction.** Wrap `ArticleCard` in `React.memo`; optionally hoist the
formatters (F8). Both are mechanical.

## F5 — Exclusive options announced as checkboxes (medium)

Sort, language and country are mutually exclusive, but they are rendered as
`DropdownMenuCheckboxItem`s (`filter-bar.tsx:138-173`). A screen reader hears
sixteen independent toggles ("Newest first, checked", "English, unchecked"…)
rather than three radio groups, which misdescribes the model — checking one
option silently unchecks its siblings. Radix ships
`DropdownMenuRadioGroup`/`DropdownMenuRadioItem` for precisely this. Selecting
the already-active item also issues a redundant `router.replace`; harmless, but
free to remove while converting.

**Why the tests missed it.** Accessibility checks verify roles exist; nothing
asserts checkbox-vs-radio matches the semantics.

## F6 — Install story has an iOS-shaped hole (medium)

`layout.tsx` metadata defines no `icons` entry, so there is no
apple-touch-icon: iOS add-to-home-screen falls back to a screenshot tile.
`app/manifest.ts:16-29` lists SVG icons only; several browsers still want PNG
192/512 before showing the install prompt at all. Meanwhile
`appleWebApp: { capable: true }` (`layout.tsx:49`) and the README's
"Installable — maskable icon" row promise more than Safari delivers. Chrome on
Android installs fine today; iOS is the gap.

**Why the tests missed it.** `e2e/shell.spec.ts:92-97` asserts the manifest is
* served*, not what individual user agents require from it.

**Fix direction.** Add a 180×180 apple-touch-icon PNG and 192/512 maskable PNGs
to the manifest; keep the SVGs.

## F7 — `DATA_CACHE` is the only unbounded cache (med-low)

The worker trims static assets (150) and images (60) via `trimCache`
(`public/sw.js:41-42`), but `/api/news` responses go through `networkFirst`
with no cap (`sw.js:168-171`). Every distinct query string — each search term,
language, country, sort and pageSize combination — is an entry kept until quota
eviction picks it. A curious searcher accumulates responses for URLs they will
never request again.

**Fix direction.** Pass a `MAX_DATA_ENTRIES` (~30) through to
`cacheInBackground`, same mechanism the other caches already use.

## F8 — `Intl` formatters built per call (low)

`formatRelativeTime` constructs a `DateTimeFormat` and/or
`RelativeTimeFormat` inside the function body (`lib/utils.ts:17,24`) and runs
once per card per render. They are locale-fixed ("en") and trivially hoistable
to module constants. Marginal alone; it compounds F4.

## F9 — No reset-filters affordance (low)

The Filters button shows a count badge of non-defaults
(`filter-bar.tsx:71-74,129-133`), but reverting means reopening the menu and
clicking each of up to three options blind. A "Reset filters" row (disabled at
zero) closes the loop the badge opens.

## F10 — Offline banner overpromises (low)

`offline-banner.tsx:18` states "showing the last articles cached on this
device" unconditionally. On a first visit that begins offline — no worker
installed, no `DATA_CACHE` — the banner is true of nothing: the feed area shows
"Could not load the feed". Copy should match the state it accompanies.

Note the related coverage hole documented in [TESTING.md](TESTING.md):
reload-offline cannot be exercised in Chromium, so no test would catch copy/state
mismatches on that path either.

## F11 — Twitter card promises an image that does not exist (low)

`layout.tsx:48` declares `twitter: { card: "summary_large_image" }`, and neither
an OG image nor a twitter-image exists anywhere in the repo (no
`opengraph-image` route/file). Link unfurls get a large-image layout with no
image. Ship an `app/opengraph-image.tsx` (generated at build time costs
nothing here) or downgrade to `"summary"` until one exists.

## F12 — `/bookmarks` keeps the default title (low)

`bookmarks/page.tsx` is a client component and cannot export `metadata`, and
there is no `app/bookmarks/layout.tsx` to do it for the segment. The tab title
is "The Feed — News Aggregator" everywhere, including on the bookmarks page.
A tiny server `layout.tsx` for the segment exporting `title: "Bookmarks"`
fixes it under the existing `%s · The Feed` template.

## F13 — Command palette is eager bundle weight (low)

`providers.tsx:8` imports `command-palette.tsx` at the root, pulling cmdk plus
Radix dialog into the initial JS for every visitor, though the palette is opened
rarely. Lazy-mounting it on first intent (first ⌘K or button press) trims the
initial bundle. Modest absolute savings; worth doing last, if at all.

## F14 — New searches keep the old scroll offset (judgment call)

`setParams` always passes `scroll: false` (`hooks/use-feed-params.ts:65-67`) —
correct for filter tweaks and pagination-adjacent writes, but a wholesale `q`
swap replaces the entire result list underneath a viewport that stays where it
was. In practice the skeleton collapse drags scroll height down and the browser
clamps near the top, but the landing position is accidental rather than chosen,
and a sentinel left in view can chain page fetches immediately. Consider
scrolling to content only when the query key changes. Listed as a decision to
make deliberately, not a defect.

## Documented trade-offs — checked, and correct as found

These looked like findings on the way past and are not. They are recorded so
the next auditor spends no time on them, and so nobody "fixes" them:

- **zod ships in the client bundle** because `parseNewsQuery` runs in
  `useFeedParams`. That is invariant #4 (one schema, both sides) doing its job.
  Removing client-side parsing would break malformed-URL resilience.
- **`MAX_BOOKMARKS` truncation is silent** (`use-bookmarks.ts:78,98,122`): the
  301st bookmark quietly pushes off the oldest. Acceptable at 300; a comment is
  the most it deserves.
- **Relative times freeze between renders.** Consequence of computing them at
  render time with no ticker; standard, and F1's refresh path would update them
  anyway.
- Everything in [GOTCHAS.md](GOTCHAS.md) was spot-checked against source and
  behaves as described: stretched-link z-order, storage-listener refcounting,
  idempotent undo, `lastPushedRef`, the SW cache strategies, reduced-motion,
  focus-visible, and the live region.

## Overlap with the backend audit

Not restated above, still tracked there: `pageSize` missing from the TanStack
query key ([AUDIT.md](AUDIT.md) #6), `titleKey` stripping `\p{Mark}` (#16),
dedup spanning the whole feed (#17). Any fix for F4 touches the same code as #6
and should pick up both.

---

## Corrections made while fixing

Two findings were fixed the way this document proposed, and the fix was wrong.
Both are recorded here rather than quietly rewritten above, because the
reasoning that produced them is the part worth not repeating.

### F1 — the diagnosis was right, the proposed fix was not

The gap is real: within a session there was no way to ask for fresh headlines.
The fix direction — "re-enable refetch-on-mount for stale queries" — does not
close it, and opens something worse.

It does not close it because the scenario the finding describes, *comes back
tomorrow*, never reaches a mount refetch. The QueryClient lives in `useState`
and is not persisted, so a new tab starts with an empty cache and fetches
regardless of the setting; a tab left open overnight does not remount at all.
`refetchOnMount` only governs the remaining case, an in-session unmount and
remount, which is the trip to `/bookmarks` and back.

It opens something worse because **TanStack refetches every cached page of an
infinite query**. A reader eight pages deep pays eight upstream requests per
trigger, against a free tier of a hundred a day — the exact budget the original
`refetchOnMount: false` was protecting. The claim above that "a mount-refetch of
a stale query is absorbed by the CDN" holds only for page one, and only inside
the 60-second `s-maxage`; deeper pages are separate URLs with separate cache
entries, and the day-old case misses all of them. TanStack's only built-in lever
is `maxPages`, which would drop already rendered cards off the top of the grid
mid-scroll.

**What shipped instead.** Both automatic triggers stay off, and the feed gets an
explicit Refresh control. `useNewsFeed.refresh()` trims the cached pages to the
first one and then refetches: one request, whatever the scroll depth, and the
reader lands on the newest page rather than on a replay of stale offsets. The
reasoning lives in `lib/query-client.ts` and ADR-012, and `hooks/use-news-feed.test.ts`
holds it in place.

### F9 — the reset row was unreachable on a phone

Adding "Reset filters" to the bottom of the filters menu made the menu eighteen
rows tall. `DropdownMenuContent` carried `overflow-hidden` and no height cap, so
the menu simply ran off the bottom of the viewport and Playwright's mobile
project could not click the new row at all — it retried for thirty seconds
against an element that was visible, enabled, stable, and off-screen.

The row was not the bug; it only reached the end of a menu that had been
overflowing since the country list was added. The content now caps itself at
`--radix-dropdown-menu-content-available-height` and scrolls.

### F13 — done as prescribed, and the bundle still grew

The split works exactly as described: cmdk and Radix Dialog leave the initial
payload and arrive on the first ⌘K. It did not make the page lighter.

Measured on production builds of `9dd2116` (before the audit) and `7cb4019`
(after), three runs each, stable to a tenth of a KB. Method: serve
`next start`, load `/`, wait for the feed, then sum `encodedBodySize` over
`performance.getEntriesByType("resource")` for `.js` — transferred bytes, not
parsed size. Repeat after pressing ⌘K to price the palette separately.

| | initial JS | palette on ⌘K |
|---|---|---|
| Before the audit | 287.8 KB | 0 — already in the bundle |
| After | 298.6 KB | +20.1 KB on demand |

**Initial JS is 10.8 KB heavier (+3.8%).** The deferred palette gives back
20.1 KB; the rest of the pass — Radix radio groups, the reset row, the refresh
control, the scroll effect, the banner subscription, the `next/dynamic` runtime
— spends about 31 KB. This document's own note on F13, "modest absolute
savings; worth doing last, if at all", turned out to be optimistic in the wrong
direction.

Nothing here is worth reverting: the added bytes buy working controls, correct
semantics and a refresh path. But the pass should not be described as having
made the client faster, because on the one metric that was measured, it did not.

**Open follow-up.** If the weight matters, two things are worth checking before
anything else, in this order: whether the lazy chunk duplicates Radix code that
the main chunk already carries (a split can do that), and whether
`@radix-ui/react-dropdown-menu` earns its size for an eighteen-row menu that a
native control could carry. Turbopack emits hashed chunk names and Next 16 no
longer writes `app-build-manifest.json`, so attributing bytes to modules needs
more than the manifest — budget an hour, and measure it the same way.

**What was not measured.** The F4/F8 render-work claims. Memoising the cards and
hoisting the `Intl` formatters plainly remove main-thread work per feed-state
flip, but no profile was taken and no number is claimed for them.

### A third thing the new tests found

The e2e suite drives every scenario through one server from one address, and
`RATE_LIMIT` is 60 per minute per address. The suite was already close enough to
that ceiling that adding scenarios pushed late-running tests into 429s, which
surface as "no articles rendered" — a failure that looks exactly like a product
bug and is not. The limit is now overridable and the Playwright server raises
it; see [TESTING.md](TESTING.md).
