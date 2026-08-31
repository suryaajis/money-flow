"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useBudgetStore } from "@/store/budgetStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useUIStore } from "@/store/uiStore";
import { CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function fmt(amount: number, currency: string) {
  const cfg = CURRENCIES[currency as keyof typeof CURRENCIES] ?? CURRENCIES.IDR;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
}

export const BudgetOverviewWidget: React.FC = () => {
  const { budgets } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { currency } = useUIStore();

  const currentMonth = format(new Date(), "yyyy-MM");
  const monthBudgets = budgets.filter((b) => b.month === currentMonth);

  if (monthBudgets.length === 0) return null;

  const [year, mon] = currentMonth.split("-").map(Number);

  function getSpent(categoryId: string) {
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.type === "expense" &&
          t.categoryId === categoryId &&
          d.getFullYear() === year &&
          d.getMonth() + 1 === mon
        );
      })
      .reduce((s, t) => s + t.amount, 0);
  }

  const items = monthBudgets.slice(0, 4).map((b) => {
    const spent = getSpent(b.categoryId);
    const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
    const over = spent > b.amount && b.amount > 0;
    const warn = pct >= 75 && !over;
    return { b, spent, pct, over, warn };
  });

  return (
    <div className="space-y-3">
      {items.map(({ b, spent, pct, over, warn }) => (
        <div key={b.id} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate">
              {b.category?.name ?? "—"}
            </span>
            <span
              className={cn(
                "text-xs shrink-0",
                over
                  ? "text-destructive font-medium"
                  : warn
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              {fmt(spent, currency)} / {fmt(b.amount, currency)}
            </span>
          </div>
          <div className="progress-flow h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                over
                  ? "bg-destructive"
                  : warn
                    ? "bg-warning"
                    : "bg-gradient-to-r from-primary to-cyan-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}
      {monthBudgets.length > 4 && (
        <p className="text-xs text-muted-foreground">
          +{monthBudgets.length - 4} more categories
        </p>
      )}
      <Link
        href="/budget"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
      >
        View all budgets <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
};
