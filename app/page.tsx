import { Suspense } from "react";

import { ArticleCardSkeleton } from "@/components/article-card";
import { NewsFeed } from "@/components/news-feed";

function FeedFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <ArticleCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    // NewsFeed reads useSearchParams, which opts the subtree into client-side
    // rendering; without a Suspense boundary the whole route would bail out.
    <Suspense fallback={<FeedFallback />}>
      <NewsFeed />
    </Suspense>
  );
}
