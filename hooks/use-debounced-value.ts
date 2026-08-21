"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Debounces a value.
 *
 * The v1 equivalent lived inside an onChange handler and returned its cleanup
 * function to nobody, so every keystroke left a live timer and fired its own
 * request. Here the timer is owned by an effect, which means React actually
 * clears it — and there is exactly one debounce in the app, not two stacked
 * ones adding up to 1.5s of latency.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export type DebouncedCallback<Args extends unknown[]> = ((...args: Args) => void) & {
  /** Drops a pending invocation. A no-op when nothing is pending. */
  cancel: () => void;
};

/**
 * Debounces a callback, cancelling any pending invocation on each new call and
 * on unmount.
 *
 * Preferred over `useDebouncedValue` when the debounced result drives an
 * external side effect (a router push, say), because it keeps the trigger in
 * the event handler instead of creating an effect that has to be guarded
 * against feedback from the state it just wrote.
 *
 * `cancel` exists because a debounced write is a promise about the future that
 * a later action can invalidate. Without it, a search still waiting out its
 * delay would land *after* the user cleared the box or picked a category, and
 * quietly reinstate the query they had just replaced.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
): DebouncedCallback<Args> {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    const debounced = ((...args: Args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    }) as DebouncedCallback<Args>;

    debounced.cancel = cancel;
    return debounced;
  }, [cancel, delayMs]);
}
