"use client";

import { BookmarkX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";

export default function BookmarksPage() {
  const { bookmarks, clear, restore, count } = useBookmarks();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Bookmarks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count === 0
              ? "Saved articles live here, on this device only."
              : `${count} saved article${count === 1 ? "" : "s"}, stored in this browser.`}
          </p>
        </div>

        {count > 0 ? (
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Remove all?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const removed = bookmarks;
                  clear();
                  setConfirming(false);
                  toast.message(`Removed ${removed.length} bookmarks`, {
                    action: {
                      // Merged back rather than written over the top: the toast
                      // stays up long enough to bookmark something new from
                      // another tab, and Undo must not delete that.
                      label: "Undo",
                      onClick: () => restore(removed),
                    },
                  });
                }}
              >
                Yes, clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Clear all
            </Button>
          )
        ) : null}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <BookmarkX className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">No bookmarks yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Tap the bookmark icon on any article to keep it here for later.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Browse the feed</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
