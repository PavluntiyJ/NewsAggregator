"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Debounces a callback, cancelling any pending invocation on each new call and
 * on unmount.
 *
 * Preferred over `useDebouncedValue` when the debounced result drives an
 * external side effect (a router push, say), because it keeps the trigger in
 * the event handler instead of creating an effect that has to be guarded
 * against feedback from the state it just wrote.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback(
    (...args: Args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
