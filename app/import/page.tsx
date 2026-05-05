"use client";

import { Suspense } from "react";
import { ImportClient } from "@/components/import/ImportClient";

/**
 * Receipt import page.
 *
 * Three-state UI: upload → processing (OCR) → confirm (review parsed data).
 * The actual logic lives in `ImportClient` so we can wrap it in Suspense for
 * `useSearchParams` (Next.js 16 requires it for client-rendered search params).
 */
export default function ImportPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted/40" />}>
      <ImportClient />
    </Suspense>
  );
}
