"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

/**
 * Loaded on first intent rather than with the app: cmdk and Radix dialog sat
 * in the initial bundle for every visitor although the palette opens rarely.
 * Once opened it stays mounted, so toggling costs no further chunk loads.
 */
const CommandPaletteDialog = dynamic(
  () =>
    import("@/components/command-palette-dialog").then(
      (module) => module.CommandPaletteDialog,
    ),
  { ssr: false },
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Opening from anywhere — ⌘K below or the header buttons through the
  // context — guarantees the dialog is mounted before it is asked to show.
  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({
      open,
      setOpen: (next: boolean) => {
        if (next) setMounted(true);
        setOpen(next);
      },
    }),
    [open],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        contextValue.setOpen(!contextValue.open);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [contextValue]);

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      {/* Mounted on first intent only; rendering on `open` alone would
          unmount the dialog on every close and re-pay the chunk load. */}
      {mounted ? <CommandPaletteDialog /> : null}
    </CommandPaletteContext.Provider>
  );
}
