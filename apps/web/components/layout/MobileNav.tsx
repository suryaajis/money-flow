"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  PiggyBank,
  ScanLine,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  ScanLine,
  Tags,
  BarChart3,
};

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-4px_rgba(251,146,60,0.1)]"
    >
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-1.5 text-xs transition-all duration-200",
                  "active:scale-95",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 px-3 items-center justify-center rounded-full transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground",
                  )}
                >
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-none font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
