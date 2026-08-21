import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Feed — News Aggregator",
    short_name: "The Feed",
    description:
      "A fast, installable news reader with instant search, bookmarks and an offline mode.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf9f6",
    theme_color: "#fbf9f6",
    categories: ["news", "magazines"],
    /**
     * SVG plus PNG: several browsers still require raster 192/512 entries
     * before showing an install prompt, and iOS reads only apple-touch-icon.
     * The PNGs are generated from app/icon.svg by `npm run icons`.
     */
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
