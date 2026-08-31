"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  PiggyBank,
  Repeat,
  ScanLine,
  Tags,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Repeat,
  HandCoins,
  ScanLine,
  Tags,
  BarChart3,
  UserCircle,
  MessageSquare,
};

// A bottom bar fits ~5 slots comfortably on a phone. Show the four most-used
// destinations plus a "More" button that reveals the rest in a sheet.
const PRIMARY_HREFS = ["/dashboard", "/transactions", "/budget", "/analytics"];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => PRIMARY_HREFS.includes(i.href));
  const secondary = NAV_ITEMS.filter((i) => !PRIMARY_HREFS.includes(i.href));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const secondaryActive = secondary.some((i) => isActive(i.href));

  return (
    <>
      {/* "More" sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Menu lainnya"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="glass-surface absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-brand-navy/15 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Menu lainnya</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {secondary.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "focus-ring flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-[transform,background-color,border-color] active:scale-[0.98]",
                        active
                          ? "neo-sticker border-brand-navy/50 bg-brand-lime font-bold text-brand-navy"
                          : "border-border text-muted-foreground hover:-rotate-1 hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                      <span className="text-xs leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        aria-label="Primary"
        className="glass-surface fixed inset-x-2 bottom-2 z-30 rounded-[1.35rem] border border-brand-navy/15 shadow-[0_18px_45px_rgba(15,23,42,.16)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "focus-ring relative m-1 flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs transition-[color,background-color,transform] active:scale-95",
                    active
                      ? "bg-brand-lime font-semibold text-brand-navy"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                  <span className="max-w-full truncate text-[11px] leading-none">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              aria-label="Menu lainnya"
              title="Menu lainnya"
              aria-expanded={moreOpen}
              className={cn(
                "focus-ring relative m-1 flex min-h-[3.25rem] w-[calc(100%_-_0.5rem)] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs transition-[color,background-color,transform] active:scale-95",
                secondaryActive || moreOpen
                  ? "bg-brand-lime font-semibold text-brand-navy"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="text-[11px] leading-none">Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
