"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
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
        title="Belum ada transaksi"
        description="Mulai dengan menambahkan pemasukan atau pengeluaran pertama kamu."
        action={
          <Link href="/transactions">
            <Button size="sm">Tambah transaksi</Button>
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
          <li
            key={tx.id}
            className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/55"
          >
            <div
              className={
                isIncome
                  ? "flex h-10 w-10 items-center justify-center rounded-xl bg-income-soft text-income transition-transform group-hover:-rotate-3 group-hover:scale-105"
                  : "flex h-10 w-10 items-center justify-center rounded-xl bg-expense-soft text-expense transition-transform group-hover:rotate-3 group-hover:scale-105"
              }
              aria-hidden
            >
              {isIncome ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownLeft className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {tx.notes || cat?.name || "Transaksi"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {cat ? <CategoryBadge category={cat} /> : null}
                <span className="text-xs text-muted-foreground">
                  {formatDate(tx.date)}
                </span>
              </div>
            </div>
            <div
              className={
                isIncome
                  ? "text-sm font-semibold tabular-nums text-income"
                  : "text-sm font-semibold tabular-nums text-expense"
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
