"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  ScanLine,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CatMascot, PawIcon } from "@/components/shared/CatIcons";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ArrowLeftRight,
  ScanLine,
  Tags,
  BarChart3,
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border md:bg-card">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="text-primary">
          <CatMascot className="h-12 w-12" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-extrabold leading-none tracking-tight">Money Flow</span>
          <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <PawIcon className="h-3 w-3" />
            Purr-sonal finance
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold",
                "transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {Icon ? <Icon className={cn("h-4 w-4", active && "scale-110 transition-transform")} /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl bg-primary-soft/60 px-4 py-3 text-xs text-foreground/80 leading-relaxed">
        <div className="flex items-center gap-1.5 mb-1 font-semibold text-foreground">
          <PawIcon className="h-3.5 w-3.5 text-primary" />
          Cozy & private
        </div>
        Your data stays on this device. No cloud, no tracking.
      </div>
    </aside>
  );
};
