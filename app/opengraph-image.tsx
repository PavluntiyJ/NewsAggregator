import { ImageResponse } from "next/og";

export const alt = "The Feed — News Aggregator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Prerendered at build time by the opengraph-image convention (the route has
 * no dynamic input, so it lands in the static output), and it feeds the
 * twitter card too. Without it, layout metadata declared
 * summary_large_image with no image anywhere — a large-image unfurl with
 * nothing large in it.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          backgroundColor: "#fbf9f6",
          color: "#1c1917",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              backgroundColor: "#c2410c",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 22,
              paddingRight: 22,
            }}
          >
            <div style={{ width: 44, height: 8, backgroundColor: "#fbf9f6", marginBottom: 14 }} />
            <div style={{ width: 72, height: 8, backgroundColor: "#fbf9f6", marginBottom: 14 }} />
            <div style={{ width: 44, height: 8, backgroundColor: "#fbf9f6" }} />
          </div>
          <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -4 }}>
            The Feed
          </div>
        </div>
        <div style={{ fontSize: 44, color: "#57534e" }}>
          A fast, installable news reader — search, bookmarks and offline.
        </div>
      </div>
    ),
    size,
  );
}
