import Link from "next/link";
import type { Metadata } from "next";
import { SleepingCat } from "@/components/shared/CatIcons";

export const metadata: Metadata = {
  title: "Offline — Money Flow",
  description: "You appear to be offline. Cached pages remain available.",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh] gap-6">
      <div className="text-primary/80">
        <SleepingCat className="h-32 w-auto" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-extrabold tracking-tight">Cat&apos;s offline too</h1>
        <p className="text-sm text-muted-foreground">
          Money Flow can&apos;t reach the network right now. Pages you&apos;ve
          already opened are still available, and any transactions you&apos;ve
          recorded remain stored on this device.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all duration-200 active:scale-95 touch-manipulation"
        >
          Back to dashboard
        </Link>
        <Link
          href="/transactions"
          className="inline-flex h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground hover:bg-accent transition-colors active:scale-95 touch-manipulation"
        >
          Open transactions
        </Link>
      </div>
    </div>
  );
}
