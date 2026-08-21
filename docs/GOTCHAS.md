# Gotchas

Code that looks wrong, redundant or removable, and is not. Every item here was
either a shipped bug or the fix for one.

Check this file when something behaves oddly *before* concluding the code is
confused. If you remove one of these guards, the corresponding test should fail —
if it does not, add the test.

## UI

**The bookmark button needs `z-10`.** `ArticleCard` uses a stretched link
(`after:absolute after:inset-0`) so each card is a single tab stop. That pseudo-
element paints above anything earlier in the DOM, including the bookmark button
sitting over the image. Without an explicit `z-10` the button is visible,
focusable and completely unclickable. Anything else you place over a card needs
the same treatment.

**The command palette is lazy, and that did not shrink the page.** Splitting it
out defers 20.1 KB to the first ⌘K, which is real, but the initial payload still
grew 10.8 KB across the frontend audit. Do not cite the split as a bundle win
without re-measuring — the numbers and the method are in
[AUDIT-FRONTEND.md](AUDIT-FRONTEND.md#f13--done-as-prescribed-and-the-bundle-still-grew).

**`DropdownMenuContent` caps its own height.** The filters menu is eighteen rows
tall — sort, seven languages, nine countries, a reset. Radix does not constrain
content height for you; without
`max-h-[var(--radix-dropdown-menu-content-available-height)]` the menu runs off
the bottom of the viewport and its last rows cannot be clicked on a phone at
all, while still reporting as visible, enabled and stable. Do not swap that cap
back for `overflow-hidden`.

**cmdk's dialog needs `contentClassName`, not `className`.** `Command.Dialog`
nests `Command` inside Radix's `Dialog.Content`. Positioning classes on
`className` land on the inner element; because that element is `fixed`, the
content wrapper collapses to zero height and the dialog never becomes visible
even though it is in the DOM with `data-state="open"`.

**`filter-bar.tsx` keeps a `lastPushedRef`.** The search box mirrors the URL, and
the URL is written by a debounced router push. Without tracking what we last
pushed, our own update echoes back through the sync effect and overwrites
characters typed while the router was still updating — the input visibly loses
keystrokes. The ref makes the effect adopt only genuinely external changes:
category chips, the command palette, the back button.

**Theme and hydration.** `ThemeToggle` renders a placeholder until
`useIsHydrated()` returns true, because the resolved theme is unknowable during
SSR. `<html>` carries `suppressHydrationWarning` because next-themes writes the
class before React hydrates — that is the mechanism, not a papered-over bug.

## State

**Refetching an infinite query replays every cached page.** `refetch()` on the
feed costs one upstream request per page the reader has scrolled, against a free
tier of a hundred a day — which is why both `refetchOnMount` and
`refetchOnWindowFocus` are off in `lib/query-client.ts` and why the Refresh
button calls `useNewsFeed.refresh()` rather than `refetch()` directly. `refresh`
trims the cache to the first page before refetching. Wiring the button straight
to `refetch` looks equivalent and is not.

**`getSnapshot` must return a cached reference.** `lib/local-store.ts` keeps the
parsed value in a module-level variable and returns the same object until a write
or a `storage` event replaces it. Parsing JSON on every call returns a fresh
object each time, `useSyncExternalStore` sees a changed snapshot on every render,
and React loops forever.

**The `storage` listener is reference-counted.** `createLocalStore` binds
`onStorage` when its first subscriber arrives and unbinds it when the last one
leaves — not once per subscriber. `addEventListener` deduplicates identical
`(type, listener)` pairs, and `onStorage` is a single closure per store, so
N subscribers ever registered one listener while any one unsubscribe removed it
for all of them. The symptom was oblique: unmounting a single article card
stopped the header's bookmark badge from following other tabs.

**Bookmark revival validates every field, not just the ones it reads first.**
`localStorage` outlives the code that wrote it, so a record from an older build
is untrusted input. Accepting a partial entry pushed the failure into
`ArticleCard`, which reads `article.source.name` — throwing on every render of
`/bookmarks`, and again after every reload, until storage was cleared by hand.

**`useDebouncedCallback` exposes `cancel`, and callers use it.** A debounced
write is a promise about the future, and clearing the search box or clicking a
category revokes it. Without cancelling, the pending push lands afterwards and
navigates back to the abandoned term. `e2e/feed.spec.ts` covers both paths;
unit tests could not, because they drove one input at a time.

**`useFeedParams` merges patches into a ref, not into `query`.** `router.replace`
is asynchronous, so between a push and its commit `query` is stale. Merging into
it drops whichever write came first. The hook tracks the query it has *requested*
and the pushes still in flight, so it can tell its own navigation landing from a
genuinely external one (back button, palette) that should supersede everything.

**The stores are module-level singletons.** `bookmarksStore` and
`searchHistoryStore` live outside React. That is what makes cross-tab sync and
the header badge work without a provider — and it is why `test/setup.ts` clears
`localStorage` between tests.

## Offline

**The service-worker controller arrives after the first paint.** `sw.js` calls
`clients.claim()` on activate, so on a first visit `navigator.serviceWorker.controller`
is null when `OfflineBanner` mounts and non-null a moment later. Reading it once
in an effect told readers whose feed really was cached to "reconnect to load the
news". It is a `useSyncExternalStore` subscription on `controllerchange` for
that reason, not for tidiness.

**The worker caches `/_next/static/` at runtime, not at install.** Chunk names
are content hashes, so a static file in `public/` cannot list them — they are
cached as the first online visit requests them. Cache-first is safe *because*
they are content-hashed: a changed file is a changed URL, never a stale hit.
Without this the worker cached the document and none of the code that renders
it, which is offline support in name only.

**Caching `/` is allowed to fail the install; the rest is not.** Optional shell
assets go through `Promise.allSettled` so one missing icon cannot cost the whole
shell. The document goes through `cache.addAll`, which rejects — a worker that
activates without a shell claims the page and then has nothing to serve.

**Cache names carry the build id, and `sw.js` is registered with `?v=`.** A
service worker cannot read server environment, so the id is inlined into the
registrar (`NEXT_PUBLIC_BUILD_ID`, set in `next.config.ts`) and read back from
`self.location`. A hand-maintained version constant rotated only when someone
remembered to edit it, so one deployment's cached responses were served to the
next. `activate` already deleted unrecognised caches; the names never changed.

**Cache writes go through `event.waitUntil`.** A bare `cache.put(...)` is a
detached promise, and the browser may terminate an idle worker the moment
`respondWith` settles — so the write never lands, intermittently and only under
memory pressure. The write is also caught: a full quota must not turn a
perfectly good network response into an error.

**Clearing the HTTP cache is what makes the offline tests mean anything.** A
reload straight after an online visit is served from Chromium's own cache and
passes whatever the worker did or did not store. `e2e/offline.spec.ts` clears it
over CDP first. That omission is the reason the suite gave a green tick to a
worker that cached no JavaScript at all.

## Server

**Rate limiting fails open on purpose.** If neither `x-forwarded-for` nor
`x-real-ip` is present, the limiter is skipped entirely rather than falling back
to a shared key. A shared bucket turns a per-client limit into a global one, and
behind a header-stripping proxy the site throttles itself. See ADR-006.

**No `AbortSignal` on the upstream fetch.** Adding one opts the request out of
the Next.js data cache, which is what keeps the deployment inside the 100
requests/day quota. See ADR-005.

**Every zod field uses `.catch()`.** A malformed search param degrades to its
default instead of returning 400. A stale bookmark with `?page=abc` must still
render news rather than an error page.

**`hasMore` is computed server-side.** The client never reasons about upstream
paging limits; it only asks whether another page exists. Moving that logic
clientward means duplicating knowledge of the GNews free-tier cap.

## Build and config

**`next dev` rewrites `CLAUDE.md`.** Next.js 16 appends a `nextjs-agent-rules`
block to agent instruction files on every dev run. It is committed deliberately —
deleting it from a diff only recreates an uncommitted change on the next
`npm run dev`. Leave it at the bottom of the file and add your own content above it.

**`next build` typechecks test files.** They are inside `tsconfig.json`'s
`include`, so a type error in a `.test.ts` fails the production build. This is
intentional — tests are code — but it does mean a broken test type blocks a
deploy, not just CI.

**Remote images are wide open by design.** `remotePatterns` is `https://**`
because publisher domains cannot be enumerated. SVG stays disabled and responses
are forced to attachment disposition; those two settings are the actual security
boundary. See ADR-009.

**Playwright caps workers at 4.** Both device projects share one Next server.
Uncapped workers starve it and produce timing failures indistinguishable from
real ones.
