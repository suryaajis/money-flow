"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PiggyBank,
  ScanLine,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  ScanLine,
  Tags,
  BarChart3,
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border md:bg-card transition-all duration-300",
        sidebarCollapsed ? "md:w-16" : "md:w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-3 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && (
          <div className="ml-2 flex flex-col">
            <span className="text-sm font-semibold leading-none">Money Flow</span>
            <span className="text-xs text-muted-foreground mt-0.5">Personal finance</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                sidebarCollapsed && "justify-center",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              {!sidebarCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer + Toggle */}
      <div className="border-t border-border px-2 py-3">
        {!sidebarCollapsed && (
          <p className="px-1 mb-2 text-xs text-muted-foreground">
            Stored in your account.
          </p>
        )}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
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
