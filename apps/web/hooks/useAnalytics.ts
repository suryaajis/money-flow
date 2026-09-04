"use client";

import { useMemo } from "react";
import type {
  CategoryAggregate,
  FinancialSummary,
  MonthlyAggregate,
  Transaction,
} from "@/lib/types";
import { lastNMonthKeys, monthKey, monthLabel } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";

interface AnalyticsOptions {
  /** When provided, restrict aggregation to these transactions. */
  transactions?: Transaction[];
  /** Number of months for the rolling monthly chart. Defaults to 6. */
  months?: number;
}

const UNKNOWN_CATEGORY_ID = 'unknown';

export function useAnalytics(opts: AnalyticsOptions = {}) {
  const { transactions: all } = useTransactions();
  const { byId } = useCategories();
  const source = opts.transactions ?? all;
  const operating = useMemo(
    () => source.filter((tx) => !tx.transferId && !tx.adjustmentReason),
    [source],
  );
  const months = opts.months ?? 6;

  const summary: FinancialSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of operating) {
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense,
      transactionCount: operating.length,
    };
  }, [operating]);

  const monthly: MonthlyAggregate[] = useMemo(() => {
    const keys = lastNMonthKeys(months);
    const buckets = new Map<string, { income: number; expense: number }>();
    for (const k of keys) buckets.set(k, { income: 0, expense: 0 });
    for (const tx of operating) {
      const key = monthKey(tx.date);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (tx.type === "income") bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }
    return keys.map((k) => {
      const b = buckets.get(k)!;
      return {
        month: monthLabel(k),
        income: round2(b.income),
        expense: round2(b.expense),
        net: round2(b.income - b.expense),
      };
    });
  }, [operating, months]);

  const expenseByCategory: CategoryAggregate[] = useMemo(() => {
    const totals = new Map<string, number>();
    let grand = 0;
    for (const tx of operating) {
      if (tx.type !== "expense") continue;
      const categoryId = tx.categoryId ?? UNKNOWN_CATEGORY_ID;
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + tx.amount);
      grand += tx.amount;
    }
    const out: CategoryAggregate[] = [];
    for (const [categoryId, total] of totals.entries()) {
      const cat = byId.get(categoryId);
      out.push({
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#94a3b8",
        total: round2(total),
        percentage: grand > 0 ? round2((total / grand) * 100) : 0,
      });
    }
    return out.sort((a, b) => b.total - a.total);
  }, [operating, byId]);

  const incomeByCategory: CategoryAggregate[] = useMemo(() => {
    const totals = new Map<string, number>();
    let grand = 0;
    for (const tx of operating) {
      if (tx.type !== "income") continue;
      const categoryId = tx.categoryId ?? UNKNOWN_CATEGORY_ID;
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + tx.amount);
      grand += tx.amount;
    }
    const out: CategoryAggregate[] = [];
    for (const [categoryId, total] of totals.entries()) {
      const cat = byId.get(categoryId);
      out.push({
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#94a3b8",
        total: round2(total),
        percentage: grand > 0 ? round2((total / grand) * 100) : 0,
      });
    }
    return out.sort((a, b) => b.total - a.total);
  }, [operating, byId]);

  // Month-over-month change in net balance for the trailing two months.
  const momChange = useMemo(() => {
    if (monthly.length < 2) return null;
    const prev = monthly[monthly.length - 2];
    const curr = monthly[monthly.length - 1];
    const delta = curr.net - prev.net;
    const pct = prev.net !== 0 ? (delta / Math.abs(prev.net)) * 100 : null;
    return { delta: round2(delta), pct: pct === null ? null : round2(pct) };
  }, [monthly]);

  return { summary, monthly, expenseByCategory, incomeByCategory, momChange };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
