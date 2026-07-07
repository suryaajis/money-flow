"use client";

import { useMemo } from "react";
import { useTransactionStore } from "@/store/transactionStore";
import type { TransactionFilters } from "@/lib/types";
import type { ApiTransaction } from "@/lib/api";

export type Transaction = ApiTransaction;

export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const { dateFrom, dateTo, categoryId, type, searchQuery, tag } = filters;
  const search = searchQuery?.toLowerCase().trim();
  const tagFilter = tag?.toLowerCase().trim();

  return transactions.filter((tx) => {
    if (type && type !== "all" && tx.type !== type) return false;
    if (categoryId && tx.categoryId !== categoryId) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    if (search) {
      const haystack = `${tx.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (tagFilter) {
      if (!tx.tags?.some((t) => t.toLowerCase().includes(tagFilter))) return false;
    }
    return true;
  });
}

export function useTransactions() {
  const transactions = useTransactionStore((s) => s.transactions);
  const filters = useTransactionStore((s) => s.filters);
  const loading = useTransactionStore((s) => s.loading);
  const hasLoaded = useTransactionStore((s) => s.hasLoaded);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const deleteMany = useTransactionStore((s) => s.deleteMany);
  const setFilters = useTransactionStore((s) => s.setFilters);
  const resetFilters = useTransactionStore((s) => s.resetFilters);
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
    loading,
    hasLoaded,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMany,
    setFilters,
    resetFilters,
    clearAll,
  };
}
