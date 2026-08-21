"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-value";
import { useFeedParams } from "@/hooks/use-feed-params";
import { useSearchHistory } from "@/hooks/use-search-history";
import {
  CATEGORIES,
  COUNTRIES,
  DEFAULT_QUERY,
  LANGUAGES,
  type Country,
  type Language,
  type SortOption,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const COUNTRY_LABELS: Record<string, string> = {
  any: "Any country",
  us: "United States",
  gb: "United Kingdom",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  ca: "Canada",
  au: "Australia",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ru: "Russian",
  pt: "Portuguese",
};

export function FilterBar() {
  const { query, setParams, activeCategory } = useFeedParams();
  const { history, record } = useSearchHistory();

  const [value, setValue] = useState(query.q);
  // Tracks what we last wrote to the URL, so our own pushes don't bounce back
  // and overwrite characters typed while the router was updating.
  const lastPushedRef = useRef(query.q);

  // Only terms the user actually typed become history entries. The empty-box
  // fallback to DEFAULT_QUERY is a URL concern — it restores the default feed —
  // but recording "artificial intelligence" as a *search the user made* used to
  // plant a phantom entry in the datalist and the palette's recents forever.
  const pushQuery = useDebouncedCallback((next: string) => {
    const trimmed = next.trim();
    const term = trimmed || DEFAULT_QUERY;
    lastPushedRef.current = term;
    setParams({ q: term });
    if (trimmed) record(trimmed);
  }, 350);

  // Adopt changes that came from somewhere else: a category chip, the command
  // palette, or the back button. Whatever the user had half-typed is no longer
  // what they asked for, so a debounce still in flight is dropped rather than
  // allowed to navigate back to it a moment later.
  useEffect(() => {
    if (query.q === lastPushedRef.current) return;
    pushQuery.cancel();
    lastPushedRef.current = query.q;
    setValue(query.q);
  }, [query.q, pushQuery]);

  const nonDefaultFilters =
    (query.sort !== "publishedAt" ? 1 : 0) +
    (query.lang !== "en" ? 1 : 0) +
    (query.country !== "any" ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="news-search" className="sr-only">
            Search news
          </label>
          <Input
            id="news-search"
            type="search"
            value={value}
            placeholder="Search news…"
            autoComplete="off"
            list="search-history"
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => {
              setValue(event.target.value);
              pushQuery(event.target.value);
            }}
          />
          {history.length > 0 ? (
            <datalist id="search-history">
              {history.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          ) : null}
          {value ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                pushQuery.cancel();
                setValue("");
                lastPushedRef.current = DEFAULT_QUERY;
                setParams({ q: DEFAULT_QUERY });
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="sm:w-auto">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {nonDefaultFilters > 0 ? (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {nonDefaultFilters}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={query.sort}
              onValueChange={(value) => {
                if (value !== query.sort) setParams({ sort: value as SortOption });
              }}
            >
              <DropdownMenuRadioItem value="publishedAt">
                Newest first
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="relevance">
                Most relevant
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={query.lang}
              onValueChange={(value) => {
                if (value !== query.lang) setParams({ lang: value as Language });
              }}
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Country</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={query.country}
              onValueChange={(value) => {
                if (value !== query.country) setParams({ country: value as Country });
              }}
            >
              {COUNTRIES.map((country) => (
                <DropdownMenuRadioItem key={country} value={country}>
                  {COUNTRY_LABELS[country] ?? country}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            {/* The badge counts non-default filters, so a one-click way back
                belongs in the same menu rather than making the user reverse
                three radio selections from memory. */}
            <DropdownMenuItem
              // pl-8 matches the radio items above, whose indicator column
              // would otherwise leave this row hanging to their left.
              className="pl-8"
              disabled={nonDefaultFilters === 0}
              onSelect={() =>
                setParams({ sort: "publishedAt", lang: "en", country: "any" })
              }
            >
              Reset filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                pushQuery.cancel();
                setValue(category.query);
                lastPushedRef.current = category.query;
                setParams({ q: category.query });
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              {category.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
