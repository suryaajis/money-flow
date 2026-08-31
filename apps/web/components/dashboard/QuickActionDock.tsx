import Link from "next/link";
import {
  BarChart3,
  PiggyBank,
  Plus,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
  featured?: boolean;
}

const actions: QuickAction[] = [
  { href: "/transactions?add=1", label: "Catat", icon: Plus, featured: true },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/import", label: "Scan", icon: ScanLine },
  { href: "/analytics", label: "Statistik", icon: BarChart3 },
];

export const QuickActionDock: React.FC = () => (
  <nav
    aria-label="Aksi cepat"
    className="mf-card grid grid-cols-4 gap-1.5 rounded-[1.7rem] border border-brand-navy/15 bg-card p-2 sm:gap-3 sm:p-3"
  >
    {actions.map(({ href, label, icon: Icon, featured }) => (
      <Link
        key={href}
        href={href}
        className={`quick-action-item focus-ring flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-1 py-2.5 text-center text-[11px] font-bold sm:flex-row sm:gap-2 sm:px-3 sm:text-xs ${
          featured
            ? "bg-brand-lime text-brand-navy"
            : "bg-muted/65 text-foreground hover:bg-brand-lime/45"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            featured ? "bg-brand-navy text-brand-lime" : "bg-card text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">{label}</span>
      </Link>
    ))}
  </nav>
);
