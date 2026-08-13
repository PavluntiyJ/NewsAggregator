import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";

import { OfflineBanner } from "@/components/offline-banner";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/app/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif-display",
  display: "swap",
});

// Vercel injects VERCEL_PROJECT_PRODUCTION_URL at build time, so link previews
// resolve correctly on a deployment without anyone having to remember to set
// NEXT_PUBLIC_SITE_URL by hand.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "The Feed — News Aggregator",
    template: "%s · The Feed",
  },
  description:
    "A fast, installable news reader with instant search, bookmarks, and an offline mode. Built with Next.js, React and TypeScript.",
  applicationName: "The Feed",
  openGraph: {
    title: "The Feed — News Aggregator",
    description:
      "A fast, installable news reader with instant search, bookmarks, and an offline mode.",
    type: "website",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "The Feed", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class onto <html> before React hydrates, which is the point.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <OfflineBanner />
          <SiteHeader />
          <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
            Built with Next.js · News from{" "}
            <a
              href="https://gnews.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GNews
            </a>
          </footer>
          <ServiceWorkerRegistrar />
        </Providers>
      </body>
    </html>
  );
}
