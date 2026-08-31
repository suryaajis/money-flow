"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

/**
 * Mobile-only floating action button for the most common action: adding a
 * transaction. Hidden on desktop (the header/toolbar buttons cover it there)
 * and on the transactions page itself, which already surfaces an add button.
 * Sits above the bottom nav and within the safe area.
 */
export const FloatingAddButton: React.FC = () => {
  const pathname = usePathname();
  if (pathname.startsWith("/transactions")) return null;

  return (
    <Link
      href="/transactions?add=1"
      aria-label="Tambah transaksi"
      className="group fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white/20 bg-gradient-to-br from-primary via-indigo-500 to-violet-600 text-primary-foreground shadow-[0_16px_34px_color-mix(in_srgb,var(--primary)_36%,transparent)] transition-transform active:scale-95 md:hidden bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"
    >
      <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
    </Link>
  );
};
