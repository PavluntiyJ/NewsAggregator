import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineBanner } from "@/components/offline-banner";

/** A minimal `navigator.serviceWorker` with a controller we can hand over later,
 *  the way `clients.claim()` does on a first visit. */
function stubServiceWorker() {
  const listeners = new Set<() => void>();
  const container = {
    controller: null as object | null,
    addEventListener: (_type: string, fn: () => void) => void listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => void listeners.delete(fn),
  };

  Object.defineProperty(navigator, "serviceWorker", {
    value: container,
    configurable: true,
  });

  return {
    claim() {
      container.controller = {};
      act(() => listeners.forEach((fn) => fn()));
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function goOffline() {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
}

beforeEach(() => {
  // Each test decides for itself whether a worker exists.
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("OfflineBanner", () => {
  it("stays out of the way while online", () => {
    stubServiceWorker();
    render(<OfflineBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("promises cached articles when a worker controls the page", () => {
    const worker = stubServiceWorker();
    worker.claim();
    goOffline();

    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(/cached on this device/i);
  });

  // A first visit that begins offline has no worker and no DATA_CACHE, so the
  // cached-articles copy would describe a state that does not exist.
  it("promises nothing when there is no worker at all", () => {
    goOffline();

    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(/reconnect to load the news/i);
  });

  // Regression: the flag used to be read once on mount. The worker calls
  // clients.claim() on activate, which lands *after* the first paint, so a
  // reader whose feed really was cached kept being told to reconnect.
  it("upgrades its copy when the worker claims the page after mount", () => {
    const worker = stubServiceWorker();
    goOffline();

    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/reconnect to load the news/i);

    worker.claim();

    expect(screen.getByRole("status")).toHaveTextContent(/cached on this device/i);
  });

  it("unsubscribes from the worker on unmount", () => {
    const worker = stubServiceWorker();
    goOffline();

    const { unmount } = render(<OfflineBanner />);
    expect(worker.listenerCount).toBe(1);

    unmount();
    expect(worker.listenerCount).toBe(0);
  });
});
