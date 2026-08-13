"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { CommandPaletteProvider } from "@/components/command-palette";

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets exactly one client, and so a
  // client is never shared between requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            // The upstream free tier is 100 requests/day; refetching on every
            // remount would spend it on nothing.
            refetchOnMount: false,
          },
        },
      }),
  );

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
