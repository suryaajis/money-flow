"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import { useAccountStore } from "@/store/accountStore";

/**
 * Mobile-only shortcut to the receipt scanner. Hidden on the scanner itself,
 * on desktop, and when the selected pocket is read-only. It sits above the
 * bottom navigation and respects the device safe area.
 */
export const FloatingScanButton: React.FC = () => {
  const pathname = usePathname();
  const accounts = useAccountStore((state) => state.accounts);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);
  const active = accounts.find((account) => account.id === activeAccountId);

  if (pathname.startsWith("/import") || !active || active.role === "viewer") {
    return null;
  }

  return (
    <Link
      href="/import"
      aria-label="Scan struk"
      title="Scan struk"
      className="neo-sticker group fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime text-brand-navy shadow-[5px_6px_0_color-mix(in_srgb,var(--brand-navy)_25%,transparent),0_18px_34px_color-mix(in_srgb,var(--brand-navy)_20%,transparent)] transition-[transform,box-shadow] hover:-translate-y-1 hover:-rotate-3 active:translate-y-1 active:scale-95 active:shadow-[1px_1px_0_color-mix(in_srgb,var(--brand-navy)_25%,transparent)] md:hidden bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"
    >
      <ScanLine className="h-6 w-6 transition-transform group-hover:scale-110" />
    </Link>
  );
};
