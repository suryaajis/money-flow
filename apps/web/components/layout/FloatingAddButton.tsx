"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawIcon } from "@/components/shared/CatIcons";
import { cn } from "@/lib/utils";

/**
 * Mobile-only floating action button that drops the user on the
 * Transactions page (where the "Add transaction" modal can be opened).
 *
 * Hidden on the Transactions page itself (the page already shows an
 * "Add transaction" button) and on the Import page (which has its own
 * primary CTA flow).
 */
const HIDE_ON: ReadonlyArray<string> = ["/transactions", "/import"];

export const FloatingAddButton: React.FC = () => {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  return (
    <Link
      href="/transactions?new=1"
      aria-label="Add transaction"
      className={cn(
        "md:hidden fixed z-30 right-4",
        // Sit above the bottom nav (pb-env safe-area aware)
        "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg shadow-primary/40",
        "transition-transform duration-200 active:scale-90 hover:scale-105",
      )}
    >
      <PawIcon className="h-6 w-6" />
    </Link>
  );
};
