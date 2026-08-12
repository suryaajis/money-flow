"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wallet, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { NAV_ITEMS } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCategoryStore } from "@/store/categoryStore";

function titleForPath(pathname: string): string {
  const match = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return match?.label ?? "Money Flow";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPath(pathname);
  const { user, logout } = useAuthStore();
  const clearTx = useTransactionStore((s) => s.clearAll);
  const clearCat = useCategoryStore((s) => s.clearAll);

  const handleLogout = () => {
    clearTx();
    clearCat();
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-6 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-4 w-4" />
        </div>
        <h1 className="truncate text-base sm:text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <CurrencyToggle />
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-1 pl-1 sm:gap-2 sm:pl-2 border-l border-border">
            <Link
              href="/settings/profile"
              title="Profil"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                {getInitials(user.name)}
              </div>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user.name}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              title="Keluar"
              aria-label="Keluar"
              className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
