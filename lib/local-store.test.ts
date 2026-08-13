import { describe, expect, it, vi } from "vitest";

import { createLocalStore } from "@/lib/local-store";

const revive = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];

describe("createLocalStore", () => {
  it("returns the fallback before anything is stored", () => {
    const store = createLocalStore<string[]>("k1", [], revive);
    store.subscribe(() => {});

    expect(store.getSnapshot()).toEqual([]);
  });

  it("persists writes to localStorage", () => {
    const store = createLocalStore<string[]>("k2", [], revive);
    store.subscribe(() => {});
    store.set(["a", "b"]);

    expect(JSON.parse(localStorage.getItem("k2") ?? "null")).toEqual(["a", "b"]);
  });

  it("reads an existing value on first subscription", () => {
    localStorage.setItem("k3", JSON.stringify(["persisted"]));

    const store = createLocalStore<string[]>("k3", [], revive);
    store.subscribe(() => {});

    expect(store.getSnapshot()).toEqual(["persisted"]);
  });

  it("returns a stable reference between reads so React does not loop", () => {
    const store = createLocalStore<string[]>("k4", [], revive);
    store.subscribe(() => {});

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("falls back when the stored payload is corrupt", () => {
    localStorage.setItem("k5", "{ not json");

    const store = createLocalStore<string[]>("k5", [], revive);
    store.subscribe(() => {});

    expect(store.getSnapshot()).toEqual([]);
  });

  it("notifies subscribers on write", () => {
    const store = createLocalStore<string[]>("k6", [], revive);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(["x"]);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createLocalStore<string[]>("k7", [], revive);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.set(["x"]);

    expect(listener).not.toHaveBeenCalled();
  });

  it("picks up writes made by another tab", () => {
    const store = createLocalStore<string[]>("k8", [], revive);
    const listener = vi.fn();
    store.subscribe(listener);

    localStorage.setItem("k8", JSON.stringify(["from-other-tab"]));
    window.dispatchEvent(new StorageEvent("storage", { key: "k8" }));

    expect(store.getSnapshot()).toEqual(["from-other-tab"]);
    expect(listener).toHaveBeenCalled();
  });

  it("ignores storage events for unrelated keys", () => {
    const store = createLocalStore<string[]>("k9", [], revive);
    const listener = vi.fn();
    store.subscribe(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps working when localStorage refuses to write", () => {
    const store = createLocalStore<string[]>("k10", [], revive);
    store.subscribe(() => {});

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => store.set(["still-works"])).not.toThrow();
    expect(store.getSnapshot()).toEqual(["still-works"]);
  });

  it("serves the fallback as the server snapshot", () => {
    const fallback: string[] = [];
    const store = createLocalStore<string[]>("k11", fallback, revive);

    expect(store.getServerSnapshot()).toBe(fallback);
  });
});
