"use client";

import { useEffect, useRef } from "react";
import { useRecurringStore } from "@/store/recurringStore";
import { useTransactionStore } from "@/store/transactionStore";
import { recurringApi, transactionsApi } from "@/lib/api";

/**
 * Checks all active recurring templates and auto-generates transactions
 * for any that are overdue (nextRunDate <= today). Runs once per app mount.
 */
export function useProcessOverdueRecurring() {
  const { recurrings, hasLoaded, fetchRecurrings } = useRecurringStore();
  const { addTransaction } = useTransactionStore();
  const processed = useRef(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchRecurrings();
    }
  }, [hasLoaded, fetchRecurrings]);

  useEffect(() => {
    if (!hasLoaded || processed.current) return;
    if (recurrings.length === 0) return;

    const today = new Date().toISOString().split("T")[0];

    const overdueActive = recurrings.filter(
      (r) => r.isActive && r.nextRunDate <= today,
    );

    if (overdueActive.length === 0) return;
    processed.current = true;

    (async () => {
      for (const r of overdueActive) {
        let runDate = r.nextRunDate;
        // Generate transactions for each missed period up to today
        while (runDate <= today) {
          const notePrefix = "[Auto]";
          const notes = r.notes
            ? `${notePrefix} ${r.notes}`
            : `${notePrefix} Recurring ${r.type}`;

          try {
            const tx = await transactionsApi.create({
              amount: Number(r.amount),
              type: r.type,
              categoryId: r.categoryId ?? "",
              date: runDate,
              notes,
            });
            // Update local store
            useTransactionStore.getState().addTransaction({
              amount: tx.amount,
              type: tx.type,
              categoryId: tx.categoryId,
              date: tx.date,
              notes: tx.notes,
              userId: tx.userId,
            });
          } catch {
            // ignore per-transaction errors, continue with others
          }

          // Advance to next run date
          runDate = advanceDate(runDate, r.frequency);
          if (r.endDate && runDate > r.endDate) break;
        }

        // Update nextRunDate on the server
        try {
          await recurringApi.update(r.id, { isActive: runDate <= (r.endDate ?? "9999-12-31") });
          useRecurringStore.setState((state) => ({
            recurrings: state.recurrings.map((item) =>
              item.id === r.id ? { ...item, nextRunDate: runDate } : item,
            ),
          }));
        } catch {
          // ignore update errors
        }
      }
    })();
  }, [hasLoaded, recurrings, addTransaction]);
}

function advanceDate(
  dateStr: string,
  frequency: string,
): string {
  const d = new Date(dateStr);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}
