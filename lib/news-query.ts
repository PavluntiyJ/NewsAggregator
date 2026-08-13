import { z } from "zod";
import { COUNTRIES, DEFAULT_QUERY, LANGUAGES, SORT_OPTIONS } from "@/lib/types";

/** GNews caps free-tier paging; going past this only ever returns errors. */
export const MAX_PAGE = 10;
export const MAX_PAGE_SIZE = 25;

export const newsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).catch(DEFAULT_QUERY).default(DEFAULT_QUERY),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(12).default(12),
  sort: z.enum(SORT_OPTIONS).catch("publishedAt").default("publishedAt"),
  lang: z.enum(LANGUAGES).catch("en").default("en"),
  country: z.enum(COUNTRIES).catch("any").default("any"),
});

export type NewsQuery = z.infer<typeof newsQuerySchema>;

/**
 * Parses URL search params into a validated query.
 *
 * Every field uses `.catch()` so a malformed value falls back to its default
 * instead of 400-ing the whole request — a stale bookmark with `?page=abc`
 * should still render news, not an error page.
 */
export function parseNewsQuery(searchParams: URLSearchParams): NewsQuery {
  return newsQuerySchema.parse({
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    lang: searchParams.get("lang") ?? undefined,
    country: searchParams.get("country") ?? undefined,
  });
}

/** Serializes a query back to search params, omitting defaults to keep URLs short. */
export function serializeNewsQuery(query: Partial<NewsQuery>): URLSearchParams {
  const defaults = newsQuerySchema.parse({});
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (value === defaults[key as keyof NewsQuery]) continue;
    params.set(key, String(value));
  }

  return params;
}
