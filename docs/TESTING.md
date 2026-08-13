# Testing

73 unit tests, 22 e2e scenarios across a desktop and a mobile profile. All of it
runs against fixtures, so the suite is deterministic, works with no network, and
never spends the upstream quota.

## Which layer to use

| Testing… | Layer | Lives in |
|---|---|---|
| Pure logic — parsing, formatting, mapping, storage | Vitest | next to the source: `lib/foo.ts` → `lib/foo.test.ts` |
| A component's markup, roles and interactions | Vitest + Testing Library | next to the component |
| The route handler's contract | Vitest, importing `GET` directly | `app/api/news/route.test.ts` |
| Anything involving real layout, navigation or the service worker | Playwright | `e2e/` |

The dividing line that matters: **three of the bugs found during the v2 rewrite
type-checked, linted and passed unit tests.** A stretched link covering a button,
a rate limiter throttling its own site, and a service worker that never
registered are all invisible below the e2e layer. If your change affects what the
browser actually does, unit tests are not sufficient evidence.

## Running

```bash
npm test                                          # all unit tests
npx vitest run lib/news-query.test.ts             # one file
npx vitest                                        # watch

npm run test:e2e                                  # both projects
npx playwright test e2e/feed.spec.ts --project=chromium
npx playwright test --ui                          # interactive
```

Playwright builds the app and starts it on port 3100 itself, with
`GNEWS_API_KEY` forced empty. You do not need a server running first.

## Fixtures are a contract

`lib/server/fixtures.ts` is not scratch data. E2E specs assert against specific
headlines and specific search terms:

| Spec expectation | Depends on |
|---|---|
| `q=quantum` finds a result | the "Quantum error-correction" seed |
| `q=science`, `q=health`, `q=news` return matches | topic tags on several seeds |
| `q=zzzznomatchzzzz` returns nothing | no seed matching that string |
| scrolling loads a second page | more than `pageSize` matches for `q=news` |

If you edit the corpus, run the e2e suite. Adding seeds is safe; renaming or
removing them is not.

Matching is deliberately loose — any term against title, description, source and
topic tags — so that demo mode behaves like a search engine rather than an exact
lookup, including returning nothing for nonsense.

## Environment stubs

`test/setup.ts` supplies what jsdom lacks: `IntersectionObserver` (the infinite
feed) and `matchMedia` (theme detection). It also clears `localStorage` between
tests, which matters because the bookmark and history stores are module-level
singletons.

`server-only` is aliased to an empty stub in `vitest.config.ts`. That package
throws by design outside a Server Component graph; under Vitest the guard has
nothing to protect. The alias is why the route handler can be imported and called
directly in tests.

## Tests that exist to encode past bugs

Do not delete these to make a suite green. Each one is a defect that shipped.

| Test | Encodes |
|---|---|
| `use-debounced-value.test.ts` → "fires once for a burst of calls" | v1 created a timer per keystroke and cleared none, so a ten-character word meant ten requests |
| `use-debounced-value.test.ts` → "cancels a pending call on unmount" | the same missing cleanup |
| `news-service.test.ts` → the status-mapping table | v1 pattern-matched error message substrings; its 429 branch could never run |
| `route.test.ts` → "never leaks the API key to the client, even on failure" | ADR-001, asserted rather than assumed |
| `route.test.ts` → "does not rate-limit when the client cannot be identified" | ADR-006; a shared bucket made the limit global |
| `article-card.test.tsx` → the `aria-pressed` toggle | the bookmark button was unclickable under the stretched link |
| `local-store.test.ts` → "returns a stable reference between reads" | a fresh object per `getSnapshot` loops React forever |

## Known emulation caveat

`e2e/offline.spec.ts` asserts the offline banner on a live connection drop, not
after a reload. Chromium reports `navigator.onLine` as `true` again on a
navigation served from the service worker cache, so a reload cannot exercise the
banner. This is an emulation artifact, not an application bug — verified by
probing `navigator.onLine` directly before and after the reload. The cached-content
assertions still run on the reload path, which is what actually matters there.

## Flakiness

Both Playwright projects share one Next server, so `workers` is capped at 4
locally and 1 in CI. Letting Playwright use every core starves the server and
produces timing failures that look like real bugs. If you see intermittent
failures, check worker count before suspecting the code — but check the rate
limiter too, since that genuinely did cause cross-test interference once.
