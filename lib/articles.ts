import type { Article } from "@/lib/types";

/**
 * Normalises a headline for duplicate detection: case, punctuation and
 * whitespace differences are ignored, everything else is significant.
 */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

/**
 * Flattens fetched pages into one feed, dropping repeats.
 *
 * Two kinds of duplicate occur in practice and both have to go:
 *
 *  - The same URL appearing twice, which upstream does across page
 *    boundaries. Left alone it produces duplicate React keys.
 *  - The same story syndicated by several outlets — wire copy and press
 *    releases, republished verbatim under different URLs. Deduplicating on URL
 *    alone leaves the feed showing one press release three times in a row,
 *    which is the single most visible quality problem in a news aggregator.
 *
 * The first occurrence wins, so upstream's own ordering decides which outlet is
 * shown. Distinct stories that happen to share an exact headline are collapsed
 * too; that is rare enough to be the better trade.
 */
export function dedupeArticles(pages: readonly { articles: Article[] }[]): Article[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Article[] = [];

  for (const page of pages) {
    for (const article of page.articles) {
      if (seenIds.has(article.id)) continue;

      const key = titleKey(article.title);
      if (key && seenTitles.has(key)) continue;

      seenIds.add(article.id);
      if (key) seenTitles.add(key);
      result.push(article);
    }
  }

  return result;
}
