"use client";

import { useMemo } from "react";
import { useTransactionStore } from "@/store/transactionStore";
import type { Transaction, TransactionFilters } from "@/lib/types";

/** Apply a filter set to a list of transactions. */
export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const { dateFrom, dateTo, categoryId, type, searchQuery } = filters;
  const search = searchQuery?.toLowerCase().trim();

  return transactions.filter((tx) => {
    if (type && type !== "all" && tx.type !== type) return false;
    if (categoryId && tx.categoryId !== categoryId) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    if (search) {
      const haystack = `${tx.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/**
 * `useTransactions` exposes the transaction list (raw or filtered) and the
 * full set of mutators. UI components should never read from the store
 * directly — they go through this hook so we can later swap the data source.
 */
export function useTransactions() {
  const transactions = useTransactionStore((s) => s.transactions);
  const filters = useTransactionStore((s) => s.filters);
  const hasHydrated = useTransactionStore((s) => s.hasHydrated);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const deleteMany = useTransactionStore((s) => s.deleteMany);
  const setFilters = useTransactionStore((s) => s.setFilters);
  const resetFilters = useTransactionStore((s) => s.resetFilters);
  const resetWithSampleData = useTransactionStore((s) => s.resetWithSampleData);
  const clearAll = useTransactionStore((s) => s.clearAll);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions],
  );

  const filtered = useMemo(() => applyFilters(sorted, filters), [sorted, filters]);

  return {
    transactions: sorted,
    filtered,
    filters,
    hasHydrated,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMany,
    setFilters,
    resetFilters,
    resetWithSampleData,
    clearAll,
  };
}
