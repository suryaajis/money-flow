import Link from "next/link";
import type { Metadata } from "next";
import { CloudOff } from "lucide-react";

export const metadata: Metadata = {
  // Root template appends " · Money Flow", so keep this to just the page name
  // to avoid "Offline — Money Flow · Money Flow".
  title: "Offline",
  description: "You appear to be offline. Cached pages remain available.",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh] gap-6">
      <div className="grid place-items-center h-20 w-20 rounded-full bg-muted text-muted-foreground">
        <CloudOff className="h-10 w-10" aria-hidden />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          Money Flow can&apos;t reach the network right now. Pages you&apos;ve already
          opened are still available, and any transactions you&apos;ve recorded
          remain stored on this device.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors touch-manipulation"
        >
          Back to dashboard
        </Link>
        <Link
          href="/transactions"
          className="inline-flex h-10 items-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors touch-manipulation"
        >
          Open transactions
        </Link>
      </div>
    </div>
  );
}
