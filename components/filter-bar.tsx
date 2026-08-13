"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-value";
import { useFeedParams } from "@/hooks/use-feed-params";
import { useSearchHistory } from "@/hooks/use-search-history";
import { CATEGORIES, COUNTRIES, DEFAULT_QUERY, LANGUAGES } from "@/lib/types";
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

  const pushQuery = useDebouncedCallback((next: string) => {
    const trimmed = next.trim() || DEFAULT_QUERY;
    lastPushedRef.current = trimmed;
    setParams({ q: trimmed });
    record(trimmed);
  }, 350);

  // Adopt changes that came from somewhere else: a category chip, the command
  // palette, or the back button.
  useEffect(() => {
    if (query.q === lastPushedRef.current) return;
    lastPushedRef.current = query.q;
    setValue(query.q);
  }, [query.q]);

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
            className="pl-9 pr-9"
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
            <DropdownMenuCheckboxItem
              checked={query.sort === "publishedAt"}
              onSelect={() => setParams({ sort: "publishedAt" })}
            >
              Newest first
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={query.sort === "relevance"}
              onSelect={() => setParams({ sort: "relevance" })}
            >
              Most relevant
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            {LANGUAGES.map((lang) => (
              <DropdownMenuCheckboxItem
                key={lang}
                checked={query.lang === lang}
                onSelect={() => setParams({ lang })}
              >
                {LANGUAGE_LABELS[lang] ?? lang}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Country</DropdownMenuLabel>
            {COUNTRIES.map((country) => (
              <DropdownMenuCheckboxItem
                key={country}
                checked={query.country === country}
                onSelect={() => setParams({ country })}
              >
                {COUNTRY_LABELS[country] ?? country}
              </DropdownMenuCheckboxItem>
            ))}
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
