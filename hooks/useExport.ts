"use client";

import { useCallback } from "react";
import type { Transaction } from "@/lib/types";
import { exportTransactionsToCSV, exportTransactionsToXLSX } from "@/lib/exportUtils";
import { useCategories } from "@/hooks/useCategories";

export function useExport() {
  const { byId } = useCategories();

  const exportXLSX = useCallback(
    (transactions: Transaction[]) => exportTransactionsToXLSX(transactions, byId),
    [byId],
  );

  const exportCSV = useCallback(
    (transactions: Transaction[]) => exportTransactionsToCSV(transactions, byId),
    [byId],
  );

  return { exportXLSX, exportCSV };
}
