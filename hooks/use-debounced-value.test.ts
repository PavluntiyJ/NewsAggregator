import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedCallback, useDebouncedValue } from "@/hooks/use-debounced-value";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("holds the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("first", 300));
    expect(result.current).toBe("first");
  });

  it("only adopts the new value after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("collapses a burst of changes into a single update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    for (const value of ["q", "qu", "qua", "quan", "quant"]) {
      rerender({ value });
      act(() => void vi.advanceTimersByTime(50));
    }

    expect(result.current).toBe("");

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe("quant");
  });
});

describe("useDebouncedCallback", () => {
  it("fires once for a burst of calls", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    // This is the v1 regression: its debounce created a timer per keystroke and
    // never cleared any of them, so ten characters meant ten requests.
    act(() => {
      for (const term of ["q", "qu", "qua", "quan"]) result.current(term);
    });

    act(() => void vi.advanceTimersByTime(300));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("quan");
  });

  it("cancels a pending call on unmount", () => {
    const spy = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 300));

    act(() => result.current("pending"));
    unmount();
    act(() => void vi.advanceTimersByTime(500));

    expect(spy).not.toHaveBeenCalled();
  });

  // Regression: without cancellation a search still waiting out its delay
  // landed after the user had already cleared the box or picked a category,
  // and navigated straight back to the term they had just replaced.
  it("drops a pending call when cancelled", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    act(() => result.current("stale"));
    act(() => result.current.cancel());
    act(() => void vi.advanceTimersByTime(500));

    expect(spy).not.toHaveBeenCalled();
  });

  it("stays usable after a cancellation", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    act(() => result.current("stale"));
    act(() => result.current.cancel());
    act(() => result.current("fresh"));
    act(() => void vi.advanceTimersByTime(300));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("fresh");
  });

  it("cancels harmlessly when nothing is pending", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    expect(() => act(() => result.current.cancel())).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps a stable identity across renders so effects do not loop", () => {
    const { result, rerender } = renderHook(() => useDebouncedCallback(vi.fn(), 300));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("always invokes the latest callback", () => {
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 300),
      { initialProps: { callback: first } },
    );

    act(() => result.current("x"));
    rerender({ callback: second });
    act(() => void vi.advanceTimersByTime(300));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("x");
  });
});
