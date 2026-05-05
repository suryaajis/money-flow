"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { HappyCatIcon, SadCatIcon } from "@/components/shared/CatIcons";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/lib/utils";

export const RecentTransactions: React.FC = () => {
  const { transactions } = useTransactions();
  const { getCategory } = useCategories();
  const { fmtSigned } = useCurrency();
  const recent = transactions.slice(0, 5);

  if (recent.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Your kitty wallet is empty. Add your first income or expense to get started."
        action={
          <Link href="/transactions">
            <Button size="sm">Add transaction</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {recent.map((tx) => {
        const cat = getCategory(tx.categoryId);
        const isIncome = tx.type === "income";
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <div
              className={
                isIncome
                  ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 flex-shrink-0"
                  : "flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300 flex-shrink-0"
              }
              aria-hidden
            >
              {isIncome ? <HappyCatIcon className="h-5 w-5" /> : <SadCatIcon className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {tx.notes || cat?.name || "Transaction"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {cat ? <CategoryBadge category={cat} /> : null}
                <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
              </div>
            </div>
            <div
              className={
                isIncome
                  ? "text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                  : "text-sm font-bold tabular-nums text-rose-500 dark:text-rose-400 flex-shrink-0"
              }
            >
              {fmtSigned(tx.amount, tx.type)}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
