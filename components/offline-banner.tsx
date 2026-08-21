"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useOnlineStatus } from "@/hooks/use-online-status";

function subscribeToController(onChange: () => void) {
  if (!("serviceWorker" in navigator)) return () => {};
  navigator.serviceWorker.addEventListener("controllerchange", onChange);
  return () =>
    navigator.serviceWorker.removeEventListener("controllerchange", onChange);
}

/**
 * Whether a service worker controls this page, i.e. whether "the last articles
 * cached on this device" is a claim we can make. A first visit that starts
 * offline has no worker and no cache, so promising cached articles next to an
 * error panel would be copy describing a state that does not exist.
 *
 * The subscription is the point, not decoration: the worker calls
 * `clients.claim()` on activate (public/sw.js), so on a first visit the
 * controller arrives *after* this component mounts. Reading it once would
 * leave a reader whose feed really is cached staring at "reconnect to load".
 */
function useHasServiceWorker(): boolean {
  return useSyncExternalStore(
    subscribeToController,
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
    // Unknowable on the server, and a first paint that claims nothing is
    // cached is the safe half of the guess.
    () => false,
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  const controlled = useHasServiceWorker();

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm text-background"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      {controlled
        ? "You are offline — showing the last articles cached on this device."
        : "You are offline. Reconnect to load the news."}
    </div>
  );
}
