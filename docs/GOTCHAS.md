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
