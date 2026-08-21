"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { CommandPaletteProvider } from "@/components/command-palette";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets exactly one client, and so a
  // client is never shared between requests during SSR.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <CommandPaletteProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-popover !text-popover-foreground !border-border !rounded-lg",
              },
            }}
          />
        </CommandPaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
