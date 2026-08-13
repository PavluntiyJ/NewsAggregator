import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-20 text-center">
      <p className="font-serif text-5xl font-semibold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist — it may have been moved or never existed.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to the feed</Link>
      </Button>
    </div>
  );
}
