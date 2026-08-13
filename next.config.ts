import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
