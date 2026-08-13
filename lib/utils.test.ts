import { describe, expect, it } from "vitest";

import { formatRelativeTime, hostnameOf, hueFromString } from "@/lib/utils";

const NOW = Date.parse("2026-08-13T12:00:00Z");

describe("formatRelativeTime", () => {
  it.each([
    ["2026-08-13T11:59:30Z", "30 seconds ago"],
    ["2026-08-13T11:30:00Z", "30 minutes ago"],
    ["2026-08-13T09:00:00Z", "3 hours ago"],
    ["2026-08-11T12:00:00Z", "2 days ago"],
  ])("renders %s as %s", (iso, expected) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected);
  });

  it("switches to an absolute date beyond a week", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z", NOW)).toBe("Jun 1, 2026");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("");
  });
});

describe("hueFromString", () => {
  it("is deterministic", () => {
    expect(hueFromString("article-1")).toBe(hueFromString("article-1"));
  });

  it("stays inside the hue range", () => {
    for (const input of ["a", "bb", "https://example.com/x", "—"]) {
      const hue = hueFromString(input);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("separates different inputs", () => {
    expect(hueFromString("alpha")).not.toBe(hueFromString("beta"));
  });
});

describe("hostnameOf", () => {
  it("strips the www prefix", () => {
    expect(hostnameOf("https://www.bbc.co.uk/news/x")).toBe("bbc.co.uk");
  });

  it("returns the input unchanged when it is not a URL", () => {
    expect(hostnameOf("nonsense")).toBe("nonsense");
  });
});
