import type { Metadata } from "next";
import type { ReactNode } from "react";

// The bookmarks page is a client component, which cannot export metadata; this
// server layout exists so the tab stops reading "The Feed — News Aggregator"
// on every route.
export const metadata: Metadata = {
  title: "Bookmarks",
};

export default function BookmarksLayout({ children }: { children: ReactNode }) {
  return children;
}
