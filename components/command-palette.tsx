"use client";

import { Command } from "cmdk";
import {
  Bookmark,
  Clock,
  Home,
  Monitor,
  Moon,
  Newspaper,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSearchHistory } from "@/hooks/use-search-history";
import { serializeNewsQuery } from "@/lib/news-query";
import { CATEGORIES } from "@/lib/types";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  }
  return context;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

const groupClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground";

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground";

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { setTheme } = useTheme();
  const { history, record, clear } = useSearchHistory();

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, [setOpen]);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      record(trimmed);
      router.push(`/?${serializeNewsQuery({ q: trimmed }).toString()}`);
      close();
    },
    [close, record, router],
  );

  const go = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [close, router],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      // cmdk nests Command inside Radix's Dialog.Content: positioning belongs on
      // the content wrapper, or it collapses to zero height and the dialog is
      // never actually visible.
      contentClassName="fixed left-1/2 top-[15%] z-50 w-[min(92vw,34rem)] -translate-x-1/2"
      className="overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search news or jump to…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Command.List className="max-h-[22rem] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          No shortcut matches. Press Enter to search the news instead.
        </Command.Empty>

        {search.trim() ? (
          <Command.Group heading="Search" className={groupClass}>
            <Command.Item
              value={`search ${search}`}
              onSelect={() => runSearch(search)}
              className={itemClass}
            >
              <Search className="size-4" aria-hidden="true" />
              Search news for “{search.trim()}”
            </Command.Item>
          </Command.Group>
        ) : null}

        <Command.Group heading="Categories" className={groupClass}>
          {CATEGORIES.map((category) => (
            <Command.Item
              key={category.id}
              value={`category ${category.label} ${category.query}`}
              onSelect={() => runSearch(category.query)}
              className={itemClass}
            >
              <Newspaper className="size-4" aria-hidden="true" />
              {category.label}
            </Command.Item>
          ))}
        </Command.Group>

        {history.length > 0 ? (
          <Command.Group heading="Recent searches" className={groupClass}>
            {history.map((entry) => (
              <Command.Item
                key={entry}
                value={`recent ${entry}`}
                onSelect={() => runSearch(entry)}
                className={itemClass}
              >
                <Clock className="size-4" aria-hidden="true" />
                {entry}
              </Command.Item>
            ))}
            <Command.Item
              value="clear search history"
              onSelect={() => clear()}
              className={itemClass}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Clear search history
            </Command.Item>
          </Command.Group>
        ) : null}

        <Command.Group heading="Navigation" className={groupClass}>
          <Command.Item value="home feed" onSelect={() => go("/")} className={itemClass}>
            <Home className="size-4" aria-hidden="true" />
            Home
          </Command.Item>
          <Command.Item
            value="bookmarks saved articles"
            onSelect={() => go("/bookmarks")}
            className={itemClass}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            Bookmarks
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Theme" className={groupClass}>
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Monitor],
            ] as const
          ).map(([value, label, Icon]) => (
            <Command.Item
              key={value}
              value={`theme ${label}`}
              onSelect={() => {
                setTheme(value);
                close();
              }}
              className={itemClass}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
