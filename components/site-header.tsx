"use client";

import { Bookmark, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { setOpen } = useCommandPalette();
  const { count } = useBookmarks();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight">
            The Feed
          </span>
          <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">
            News Aggregator
          </span>
        </Link>

        <Button
          variant="outline"
          aria-label="Open search"
          onClick={() => setOpen(true)}
          className="hidden w-56 justify-start gap-2 text-muted-foreground sm:flex"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Open search"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4" />
        </Button>

        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("relative", pathname === "/bookmarks" && "text-primary")}
        >
          <Link href="/bookmarks" aria-label={`Bookmarks (${count} saved)`}>
            <Bookmark className="size-4" aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
