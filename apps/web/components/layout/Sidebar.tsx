"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  LayoutDashboard,
  MessageSquare,
  PiggyBank,
  Repeat,
  ScanLine,
  Tags,
  UserCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

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

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "z-30 hidden overflow-hidden bg-brand-navy text-white shadow-[12px_0_38px_rgba(0,0,0,.16)] transition-all duration-300 md:fixed md:inset-y-0 md:flex md:flex-col",
        sidebarCollapsed ? "md:w-[4.5rem]" : "md:w-[17rem]",
      )}
    >
      {/* Logo */}
      <div className="flex h-[4.75rem] items-center overflow-hidden border-b border-white/12 px-4">
        <div className="neo-sticker relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-brand-lime text-brand-navy">
          <Wallet className="h-[1.1rem] w-[1.1rem]" />
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-brand-navy bg-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="ml-3 flex flex-col">
            <span className="text-[15px] font-bold leading-none tracking-[-0.02em]">
              MoneyFlow
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
              uang, tapi santai
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "focus-ring group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-[background-color,color,transform,box-shadow]",
                sidebarCollapsed && "justify-center",
                active
                  ? "bg-brand-lime font-bold text-brand-navy shadow-[4px_5px_0_rgba(0,0,0,.18)]"
                  : "text-white/62 hover:translate-x-1 hover:bg-white/10 hover:text-white",
              )}
            >
              {Icon ? (
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-brand-navy text-brand-lime"
                      : "bg-white/10 group-hover:bg-brand-lime group-hover:text-brand-navy",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : null}
              {!sidebarCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer + Toggle */}
      <div className="border-t border-white/12 px-3 py-3">
        {!sidebarCollapsed && (
          <div className="mb-3 flex items-center gap-2 rounded-[1.15rem] border border-white/12 bg-white/[0.07] p-2.5">
            <FlowBuddy size="sm" />
            <p className="text-[11px] leading-snug text-white/60">
              Pelan-pelan, uangmu mulai lebih tertata ✨
            </p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "focus-ring flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs text-white/55 transition-colors hover:bg-white/10 hover:text-white",
            sidebarCollapsed && "justify-center",
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
