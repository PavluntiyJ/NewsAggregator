"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/types";

type BookmarkButtonProps = {
  article: Article;
  className?: string;
};

export function BookmarkButton({ article, className }: BookmarkButtonProps) {
  const { has, toggle } = useBookmarks();
  const saved = has(article.id);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? `Remove "${article.title}" from bookmarks` : `Bookmark "${article.title}"`}
      className={cn(
        "size-9 rounded-full backdrop-blur-sm transition-colors",
        "bg-background/80 hover:bg-background",
        saved && "text-primary",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const added = toggle(article);
        toast[added ? "success" : "message"](
          added ? "Saved to bookmarks" : "Removed from bookmarks",
          {
            description: article.title,
            action: {
              label: "Undo",
              onClick: () => toggle(article),
            },
          },
        );
      }}
    >
      {saved ? (
        <BookmarkCheck className="size-4" aria-hidden="true" />
      ) : (
        <Bookmark className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
