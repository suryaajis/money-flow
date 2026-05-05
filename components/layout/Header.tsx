"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { NAV_ITEMS } from "@/lib/constants";
import { CatMascot } from "@/components/shared/CatIcons";

function titleForPath(pathname: string): string {
  const match = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return match?.label ?? "Money Flow";
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        <div className="md:hidden text-primary">
          <CatMascot className="h-9 w-9" />
        </div>
        <h1 className="text-base sm:text-lg font-extrabold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <CurrencyToggle />
        <ThemeToggle />
      </div>
    </header>
  );
};
