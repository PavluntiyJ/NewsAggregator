# External audit

An independent agent (Codex) reviewed the whole v2 tree at commit `1babd68`
against a brief that asked for failure scenarios rather than style notes, and
for an explanation of *why the existing tests missed each one*. It returned 20
findings and no critical ones — in particular it found no path by which
`GNEWS_API_KEY` reaches the browser bundle or a response.

This file is the backlog. It exists because the findings were delivered in a
chat and would otherwise have survived only there; a review nobody can re-read
is a review that happened once.

## How the list was triaged

Sixteen findings were accepted as stated. Two needed checking against upstream
documentation before they could be actioned (#5, #7). One (#17) is a
consciously documented trade-off rather than a defect, though the counter-example
supplied was good enough to justify narrowing it.

Finding #1 is worth reading closely, because the reported mechanism was wrong
and the bug was worse than described. Codex predicted GNews would reject
`max=12` with a 400. Querying production showed it does not reject anything — it
silently clamps `max` to 10 and says nothing:

```
pageSize=10  -> 10 articles, hasMore=True
pageSize=12  -> 10 articles, hasMore=False   <- broken
pageSize=25  -> 10 articles, hasMore=False
```

`hasMore` was `articles.length === query.pageSize`, so `10 === 12` ended the
feed immediately. With the default page size of 12, the infinite feed in
production was dead: ten articles and "That's everything for this search".
Neither the fixtures nor the unit mocks could catch it, because both return
exactly as many articles as they are asked for. It was found by querying the
live deployment. See [DECISIONS.md](DECISIONS.md) for what that changed.

## Status

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | high | Default `pageSize` exceeds what the free tier returns, killing the feed | fixed (`5ff761b`) |
| 8 | medium | `hasMore` derived from the normalized count, so one dropped row ended paging | fixed (`5ff761b`) |
| — | — | Paging refused past page one surfaced as an error over working articles | fixed (`7a80ee3`) |
| 2 | high | A pending search debounce overwrites a later clear or category click | fixed |
| 3 | high | Concurrent parameter writes merge against a stale query and discard a newer search | fixed |
| 12 | medium | Unsubscribing one consumer removes cross-tab sync for all the others | fixed |
| 14 | medium | Bookmark revival accepts incomplete objects, permanently breaking `/bookmarks` | fixed |
| 18 | medium | Undo is not idempotent and can destroy later changes | fixed |
| 4 | high | The cached app shell omits the JS/CSS needed to render it | fixed |
| 10 | medium | Service worker cache names are pinned to a version, so data crosses deployments | fixed |
| 11 | medium | `cache.put` is not tied to the fetch event lifetime | fixed |
| 5 | medium | The API key travels in the outbound URL, where proxies log it | open — needs confirming GNews accepts a header |
| 6 | medium | `pageSize` affects paging offsets but is missing from the query key | open |
| 7 | medium | `MAX_PAGE = 10` is invented; the real cap is 1,000 articles | open — needs confirming against upstream docs |
| 9 | medium | An invalid article URL with no source throws and fails the whole page | open |
| 13 | medium | Cross-tab read-modify-write can overwrite a newer entry | open |
| 15 | medium | A malformed success envelope is presented as an empty result | open |
| 16 | medium | `titleKey` strips `\p{Mark}`, colliding distinct headlines | open |
| 19 | low | Failed persistence is swallowed while the UI reports success | open |
| 20 | low | A comment promises the real cause is logged; both catches discard it | open |
| 17 | medium | Title dedup spans the whole feed and can drop a separate later event | open — accepted trade-off, worth narrowing by date proximity |

## Working order

What is left is correctness and hygiene: #6, #9, #16, #5, #7, #13, #15, #19,
#20, #17. Two of them (#5, #7) are claims about the upstream API rather than
about this code, and must be checked against GNews documentation before
anything is changed — the audit's stated mechanism for #1 turned out to be
wrong, and the truth was worse than the report.

Every fix carries a regression test; that is the invariant in
[../AGENTS.md](../AGENTS.md), and several of these bugs exist precisely because
a test asserted the shape of a result without asserting the behaviour around it.
