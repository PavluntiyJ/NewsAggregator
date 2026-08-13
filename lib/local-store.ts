type Listener = () => void;

export type LocalStore<T> = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: T) => void;
  update: (updater: (current: T) => T) => void;
};

/**
 * A localStorage-backed store shaped for `useSyncExternalStore`.
 *
 * Two things this buys us over reading localStorage in an effect:
 *
 *  - No hydration mismatch. The server snapshot is always the fallback, and the
 *    real value is adopted right after subscription, which React handles by
 *    re-reading the snapshot and re-rendering once.
 *  - Tabs stay in sync, because `storage` events refresh the cache.
 *
 * `getSnapshot` returns a cached reference rather than re-parsing JSON on every
 * call — returning a fresh object each time would make React loop forever.
 */
export function createLocalStore<T>(
  key: string,
  fallback: T,
  revive: (raw: unknown) => T,
): LocalStore<T> {
  let cache: T = fallback;
  let hydrated = false;
  const listeners = new Set<Listener>();

  function read(): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return revive(JSON.parse(raw));
    } catch {
      // Corrupt payload or storage disabled (private mode, quota) — fall back
      // rather than taking the whole page down.
      return fallback;
    }
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== key) return;
    cache = read();
    emit();
  }

  function set(next: T): void {
    cache = next;
    hydrated = true;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or unavailable: keep the in-memory value so the current
      // session still works, just without persistence.
    }
    emit();
  }

  return {
    subscribe(listener) {
      if (!hydrated) {
        hydrated = true;
        cache = read();
      }

      listeners.add(listener);
      window.addEventListener("storage", onStorage);

      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },

    getSnapshot: () => cache,
    getServerSnapshot: () => fallback,
    set,
    update: (updater) => set(updater(cache)),
  };
}
