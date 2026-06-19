"use client";

import { usePathname, useRouter } from "next/navigation";
import { Wallet, LogOut, User } from "lucide-react";
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        <div className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-4 w-4" />
        </div>
        <h1 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <CurrencyToggle />
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
