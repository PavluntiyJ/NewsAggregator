"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True once the client has hydrated, false during SSR and the first render.
 *
 * The usual `useState(false)` + `useEffect(() => setMounted(true))` does the
 * same job but triggers a cascading render, which React's lint rules now flag.
 * `useSyncExternalStore` expresses "server and client disagree here" directly,
 * and React handles the single re-render itself.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
