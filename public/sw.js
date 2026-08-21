/* eslint-disable no-undef */
/**
 * Service worker for The Feed.
 *
 * Four caching strategies, one per kind of request:
 *
 *   navigations    → network-first, falling back to the cached shell when offline
 *   /_next/static  → cache-first; these are content-hashed and immutable
 *   /api/news      → network-first, falling back to the last successful response
 *   images         → cache-first with a bounded cache
 *
 * Network-first (rather than cache-first) for news is deliberate: stale
 * headlines presented as current would be worse than a brief spinner.
 */

/**
 * Cache namespaces are stamped with the deployment that created them.
 *
 * The registrar appends `?v=<build id>`, so a new deployment gets a new worker
 * URL and a new set of cache names, and `activate` deletes everything that does
 * not match. A hand-maintained constant could not do this: it only changed when
 * someone remembered to change it, so a response cached by one deployment was
 * served to a later one whose code expected a different shape.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const DATA_CACHE = `data-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;

/**
 * Without the document there is no shell, so failing to cache it must fail the
 * install. The alternative — a worker that activates anyway — is worse than no
 * worker at all: it claims the page and then has nothing to serve.
 */
const REQUIRED_SHELL_ASSETS = ["/"];

/** Nice to have offline. A 404 on any of these must not block the install. */
const OPTIONAL_SHELL_ASSETS = ["/bookmarks", "/icons/icon.svg"];

const MAX_IMAGE_ENTRIES = 60;
const MAX_STATIC_ENTRIES = 150;
/**
 * News responses are keyed by their full query string, so every search term,
 * language, country, sort and pageSize combination is its own entry. Without a
 * cap a curious searcher accumulates responses for URLs they will never ask
 * for again; 30 comfortably covers a browsing session's active views.
 */
const MAX_DATA_ENTRIES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // addAll is atomic, so the optional assets are added independently: one
      // missing icon should not cost us the whole shell.
      await Promise.allSettled(OPTIONAL_SHELL_ASSETS.map((asset) => cache.add(asset)));

      // This one is allowed to reject, and installation fails with it.
      await cache.addAll(REQUIRED_SHELL_ASSETS);

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE, DATA_CACHE, IMAGE_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

/**
 * Writes to the cache without making the response wait for them, and without
 * letting a cache failure become a network failure.
 *
 * `event.waitUntil` is the point: a bare `cache.put(...)` is a detached promise,
 * and the browser is free to terminate an idle worker the moment `respondWith`
 * settles. The write then never lands, and the next offline request finds
 * nothing — intermittently, and only under memory pressure, which is the worst
 * way to discover it.
 */
function cacheInBackground(event, cacheName, request, response, maxEntries) {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
      if (maxEntries) await trimCache(cacheName, maxEntries);
    })().catch(() => {
      // Quota, storage disabled, an evicted bucket: none of it should surface
      // to the page, which already has its response.
    }),
  );
}

async function networkFirst(event, cacheName, fallbackUrl, maxEntries) {
  const { request } = event;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cacheInBackground(event, cacheName, request, response.clone(), maxEntries);
    }
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }

    throw error;
  }
}

async function cacheFirst(event, cacheName, maxEntries) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cacheInBackground(event, cacheName, request, response.clone(), maxEntries);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never interfere with anything that mutates state or leaves our origin.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event, SHELL_CACHE, "/"));
    return;
  }

  /**
   * The cached document is useless without the code that renders it.
   *
   * Precaching these by name is not possible from a static file — the chunk
   * names are content hashes only known after a build — so they are cached as
   * the first online visit requests them. Cache-first is safe precisely because
   * the names are content hashes: a changed file is a changed URL, never a
   * stale hit.
   */
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, STATIC_CACHE, MAX_STATIC_ENTRIES));
    return;
  }

  if (url.pathname.startsWith("/api/news")) {
    event.respondWith(networkFirst(event, DATA_CACHE, undefined, MAX_DATA_ENTRIES));
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(event, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
  }
});
