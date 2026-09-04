"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sparkles, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ActivePocketSwitcher } from "@/components/layout/ActivePocketSwitcher";
import { NAV_ITEMS } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useAccountStore } from "@/store/accountStore";

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
  const clearAccounts = useAccountStore((s) => s.clearAll);

  const handleLogout = () => {
    clearTx();
    clearCat();
    clearAccounts();
    logout();
    router.replace("/login");
  };

  return (
    <header className="glass-surface sticky top-0 z-20 flex h-[4.75rem] items-center justify-between gap-2 border-b border-brand-navy/10 px-4 sm:gap-4 sm:px-6 md:px-8 xl:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="neo-sticker relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-lime text-brand-navy md:hidden">
          <Wallet className="h-4 w-4" />
          <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-brand-navy" />
        </div>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45 sm:block">
            MoneyFlow space
          </p>
          <h1 className="truncate text-base font-bold tracking-[-0.02em] sm:text-lg">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ActivePocketSwitcher />
        <ThemeToggle />
        {user && (
          <div className="ml-1 flex items-center gap-1 border-l border-border/80 pl-2 sm:gap-2 sm:pl-3">
            <Link
              href="/settings/profile"
              title="Profil"
              className="group flex items-center gap-2 rounded-xl p-0.5 transition-opacity hover:opacity-90"
            >
              <div className="neo-sticker flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-lime text-xs font-black text-brand-navy transition-transform group-hover:-rotate-3 group-hover:scale-105">
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
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
