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
      // The build id travels in the URL because a service worker cannot read
      // server environment — it is a static file. A new deployment therefore
      // means a new script URL, which is what makes the browser install a new
      // worker and lets it namespace its caches per deployment.
      const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "local";
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(buildId)}`)
        .catch((error) => {
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
