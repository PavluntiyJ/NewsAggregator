import { ArrowUpRight } from "lucide-react";
import { memo } from "react";

import { ArticleImage } from "@/components/article-image";
import { BookmarkButton } from "@/components/bookmark-button";
import { formatRelativeTime, hostnameOf } from "@/lib/utils";
import type { Article } from "@/lib/types";

type ArticleCardProps = {
  article: Article;
  priority?: boolean;
};

/**
 * Memoised because the feed re-renders the whole grid on every page append and
 * on each flip of `isFetchingNextPage`. Card props are stable across those
 * renders — article objects come from cached pages, so their references
 * persist — which makes memoisation skip all of the work. Without it, an
 * infinite feed re-reconciles every accumulated card three times per
 * page-load, and the cost grows with scroll depth exactly where jank is most
 * visible.
 */
export const ArticleCard = memo(function ArticleCard({
  article,
  priority = false,
}: ArticleCardProps) {
  const sourceName = article.source.name || hostnameOf(article.url);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:shadow-lg focus-within:shadow-lg">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <ArticleImage
          src={article.image}
          alt=""
          seed={article.id}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {/* z-10 keeps this above the stretched link's ::after overlay below,
            which would otherwise swallow every click on the button. */}
        <BookmarkButton article={article} className="absolute right-2 top-2 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>
            {formatRelativeTime(article.publishedAt)}
          </time>
        </div>

        <h2 className="text-balance text-lg font-semibold leading-snug">
          {/* The whole card is clickable via this stretched link, which keeps a
              single tab stop per article instead of one per interactive area. */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="after:absolute after:inset-0 after:content-[''] hover:text-primary"
          >
            {article.title}
          </a>
        </h2>

        {article.description ? (
          <p className="line-clamp-3 text-pretty text-sm text-muted-foreground">
            {article.description}
          </p>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
          Read more
          <ArrowUpRight
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </article>
  );
});

export function ArticleCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[16/9] w-full animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
