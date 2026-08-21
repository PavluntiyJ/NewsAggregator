import type { NextConfig } from "next";

/**
 * Identifies the deployment that produced this build.
 *
 * The service worker namespaces its caches with it, so responses cached by one
 * deployment are never served to a later one whose code expects a different
 * shape. It has to be inlined at build time because `public/sw.js` is a static
 * file: nothing templates it, and it cannot read server environment.
 *
 * Local builds deliberately get a fixed id rather than a timestamp, so the e2e
 * suite sees stable cache names across runs.
 */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  images: {
    // News images come from an open-ended set of publisher domains, so the
    // hostname cannot be enumerated. Everything else is locked down: SVG stays
    // disabled (it can carry script), and responses are forced to attachment
    // semantics so the optimizer can't be abused to serve active content.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    minimumCacheTTL: 60 * 60 * 24,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // The service worker must never be served stale, or clients get stuck
        // on an old cache strategy forever.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
