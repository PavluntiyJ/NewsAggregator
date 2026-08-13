import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "3 hours ago" / "2 days ago", falling back to a plain date past a week. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "";

  const diffSeconds = Math.round((timestamp - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds > 604_800) {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(timestamp);
  }

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86_400, "hour"],
    [604_800, "day"],
  ];

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let value = diffSeconds;

  for (let i = 0; i < divisions.length; i += 1) {
    const [limit, candidate] = divisions[i]!;
    if (absSeconds < limit) {
      const divisor = i === 0 ? 1 : divisions[i - 1]![0];
      unit = candidate;
      value = Math.round(diffSeconds / divisor);
      break;
    }
  }

  return formatter.format(value, unit);
}

/** Deterministic hue from a string — used for article image placeholders so a
 *  given article always gets the same colour. */
export function hueFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
