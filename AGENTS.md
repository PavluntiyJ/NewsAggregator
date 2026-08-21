# AGENTS.md

Canonical briefing for any AI agent working in this repository — Claude Code,
Codex, Cursor, or anything else. Start here, then follow the routing table to
the document that matches your task. `CLAUDE.md` points here on purpose; do not
duplicate content into it.

## What this is

A news aggregator: Next.js 16 App Router, React 19, TypeScript strict, Tailwind
v4, TanStack Query. It reads the GNews API through a server-side proxy, and
falls back to local fixtures when no API key is present.

It is a **portfolio project**. The audience is a human reading the code in a
review, not end users at scale. That changes what "good" means here: a decision
you can defend out loud beats a clever shortcut, and the reasoning belongs in
the code and in `docs/`, not only in commit messages.

## Setup and commands

```bash
npm install
npm run dev          # http://localhost:3000 — works with no API key, in demo mode
npm run build        # production build; also typechecks, test files included
npm run lint
npm run typecheck
npm test             # Vitest, single run
npm run test:e2e     # Playwright; builds and starts the app on :3100 itself
npm run screenshots  # regenerates README images (needs a server on :3100)
```

Run one unit file: `npx vitest run lib/news-query.test.ts`
Run one e2e file: `npx playwright test e2e/feed.spec.ts --project=chromium`

Before claiming any task is done, `npm run lint && npm run typecheck && npm test`
must all pass. If you touched anything the browser renders, run `npm run test:e2e`
too — three real bugs in this codebase type-checked and linted cleanly, and only
the e2e suite caught them.

## Routing table

| If your task is… | Read |
|---|---|
| Understanding how a request flows, or where state lives | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Changing or questioning a design choice | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Adding or fixing tests, or touching fixtures | [docs/TESTING.md](docs/TESTING.md) |
| Debugging something that "should work" | [docs/GOTCHAS.md](docs/GOTCHAS.md) |
| Picking up known outstanding defects | [docs/AUDIT.md](docs/AUDIT.md) |
| Picking up known frontend, UI/UX or performance defects | [docs/AUDIT-FRONTEND.md](docs/AUDIT-FRONTEND.md) |
| Explaining the project to a human | [README.md](README.md) |

Read the routed document before editing, not after something breaks. Each one is
short; none is optional context you can infer from the source.

## Invariants

These are not preferences. Breaking one is a regression even if tests pass.

1. **The API key never reaches the browser.** It is read only in
   `lib/server/news-service.ts`, reached only through `app/api/news/route.ts`.
   Both are guarded by `server-only`. No `NEXT_PUBLIC_` variant, ever.
2. **Errors cross the wire as codes, not prose.** `NewsErrorCode` is the
   contract. Never branch on a substring of an error message — v1 did, and its
   rate-limit handler silently never ran.
3. **The URL owns feed state.** Query, sort, language and country live in search
   params; nothing caches a second copy. Page index is deliberately absent — the
   infinite feed always starts at page 1.
4. **One schema, both sides.** `lib/news-query.ts` is parsed by the server and
   serialised by the client. Adding a parameter means editing that file, not
   two parallel definitions.
5. **Demo mode must keep working.** With no `GNEWS_API_KEY`, the app, the unit
   tests, the e2e suite and CI all run against fixtures. Anything that requires
   a live key to function is broken.
6. **Every fixed bug gets a regression test.** Several existing tests exist only
   to encode past defects. Do not delete them to make a suite green.

## Repo map

```
app/
  api/news/route.ts     the only entry point to the upstream API
  page.tsx              Suspense boundary around the client feed
  bookmarks/page.tsx
  layout.tsx            fonts, metadata, providers, shell
lib/
  news-query.ts         zod schema shared by client and server
  types.ts              domain types, category and filter constants
  api-client.ts         browser-side fetcher for /api/news
  local-store.ts        localStorage store for useSyncExternalStore
  utils.ts              formatting helpers
  server/               server-only: upstream client, rate limit, fixtures
hooks/                  feed params, infinite query, debounce, bookmarks, history
components/             UI; all presentational except NewsFeed and FilterBar
  ui/                   primitives (button, input, dropdown, skeleton, badge)
e2e/                    Playwright specs
test/                   Vitest setup and stubs
docs/                   the documents in the routing table above
```

## Next.js 16 is probably newer than your training data

Its APIs, conventions and file layout may differ from what you remember. The
authoritative reference ships with the dependency: read the relevant guide in
`node_modules/next/dist/docs/` before writing App Router code, and heed
deprecation notices there over anything you recall.

`next dev` maintains a generated block at the bottom of `CLAUDE.md` saying the
same thing. It is committed on purpose — deleting it only recreates an
uncommitted change on the next dev run.

## Working style

- Match the surrounding code: named exports, `type` over `interface`, `cn()` for
  class composition, comments that explain *why* rather than restate the code.
- Comments in this repo carry design rationale. If you change behaviour a
  comment describes, update the comment in the same edit.
- Prefer deleting to deprecating. There is no external consumer of this code.
- When you find a real problem outside your task, say so — do not silently widen
  the change.
