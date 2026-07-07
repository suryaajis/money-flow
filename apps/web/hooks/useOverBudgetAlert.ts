"use client";

import { useEffect, useRef } from "react";
import { useTransactionStore } from "@/store/transactionStore";
import { useNotificationStore } from "@/store/notificationStore";
import { showOverBudgetNotification } from "@/lib/notifications";
import { format } from "date-fns";

/**
 * Monitors spending vs budgets and fires a push notification when any category
 * exceeds its monthly budget limit. Requires the budget feature to be present
 * (moneyflow/feat-budget merged). Runs on every transaction-store update.
 */
export function useOverBudgetAlert(
  budgets: Array<{ id: string; categoryId: string; amount: number; month: string; category?: { name: string } }>,
) {
  const { transactions } = useTransactionStore();
  const overBudgetEnabled = useNotificationStore((s) => s.overBudgetEnabled);
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    if (!overBudgetEnabled || budgets.length === 0) return;

    const currentMonth = format(new Date(), "yyyy-MM");
    const [year, mon] = currentMonth.split("-").map(Number);

    for (const budget of budgets) {
      if (budget.month !== currentMonth || budget.amount <= 0) continue;

      const spent = transactions
        .filter((t) => {
          const d = new Date(t.date);
          return (
            t.type === "expense" &&
            t.categoryId === budget.categoryId &&
            d.getFullYear() === year &&
            d.getMonth() + 1 === mon
          );
        })
        .reduce((s, t) => s + t.amount, 0);

      const alertKey = `${budget.id}-${currentMonth}`;
      if (spent > budget.amount && !alerted.current.has(alertKey)) {
        alerted.current.add(alertKey);
        const categoryName = budget.category?.name ?? "Kategori";
        showOverBudgetNotification(categoryName, spent, budget.amount);
      }
    }
  }, [transactions, budgets, overBudgetEnabled]);
}
