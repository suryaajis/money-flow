"use client";

import { useEffect } from "react";
import { useTransactionStore } from "@/store/transactionStore";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * On the first ever load (no `seeded` flag in localStorage), populate the
 * store with sample transactions so the dashboard isn't empty. Runs once.
 */
export const DataBootstrap: React.FC = () => {
  const hasHydrated = useTransactionStore((s) => s.hasHydrated);
  const transactions = useTransactionStore((s) => s.transactions);
  const resetWithSampleData = useTransactionStore((s) => s.resetWithSampleData);

  useEffect(() => {
    if (!hasHydrated) return;
    const seeded = localStorage.getItem(STORAGE_KEYS.seeded);
    if (!seeded && transactions.length === 0) {
      resetWithSampleData();
      localStorage.setItem(STORAGE_KEYS.seeded, "1");
    }
  }, [hasHydrated, transactions.length, resetWithSampleData]);

  return null;
};
