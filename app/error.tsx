"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-20 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page.
          {error.digest ? (
            <>
              {" "}
              Reference: <code className="text-xs">{error.digest}</code>
            </>
          ) : null}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
