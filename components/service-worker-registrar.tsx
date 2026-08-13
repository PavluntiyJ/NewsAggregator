"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only.
 *
 * In development a cached app shell fights hot reload, and the resulting "why
 * is my change not showing up" confusion is not worth the offline support.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    };

    // Waiting unconditionally for `load` silently never registers when the
    // event has already fired by the time this effect runs — which is the
    // common case on a fast page or after a client-side navigation.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
