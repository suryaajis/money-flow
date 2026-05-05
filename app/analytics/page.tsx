"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategorySpendingList } from "@/components/analytics/CategorySpendingList";
import { InsightCard } from "@/components/analytics/InsightCard";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { HappyCatIcon, SadCatIcon } from "@/components/shared/CatIcons";
import { useTransactions } from "@/hooks/useTransactions";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrency } from "@/hooks/useCurrency";
import type { Transaction } from "@/lib/types";

const RANGES = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
] as const;

export default function AnalyticsPage() {
  const { transactions } = useTransactions();
  const [months, setMonths] = useState<number>(6);
  const { fmt } = useCurrency();

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1));
    return d.toISOString().slice(0, 10);
  }, [months]);

  const inRange: Transaction[] = useMemo(
    () => transactions.filter((tx) => tx.date >= cutoff),
    [transactions, cutoff],
  );

  const { summary, monthly, expenseByCategory, momChange } = useAnalytics({
    transactions: inRange,
    months,
  });

  const topCategory = expenseByCategory[0];

  const momTone = momChange === null
    ? "neutral"
    : momChange.delta >= 0
      ? "positive"
      : "negative";
  const momIcon = momTone === "positive"
    ? <TrendingUp className="h-4 w-4" />
    : momTone === "negative"
      ? <TrendingDown className="h-4 w-4" />
      : <Wallet className="h-4 w-4" />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trends and insights across your selected period.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="range">Period</Label>
          <Select id="range" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {RANGES.map((r) => (
              <option key={r.months} value={r.months}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          label="Net balance"
          value={fmt(summary.totalBalance)}
          tone={summary.totalBalance >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <InsightCard
          label="Income"
          value={fmt(summary.totalIncome)}
          tone="positive"
          icon={<HappyCatIcon className="h-4 w-4" />}
        />
        <InsightCard
          label="Expense"
          value={fmt(summary.totalExpense)}
          tone="negative"
          icon={<SadCatIcon className="h-4 w-4" />}
        />
        <InsightCard
          label="This month vs last"
          value={
            momChange === null
              ? "—"
              : `${momChange.delta >= 0 ? "+" : ""}${fmt(momChange.delta)}`
          }
          delta={
            momChange === null
              ? undefined
              : momChange.pct === null
                ? "vs last month"
                : `${momChange.pct >= 0 ? "+" : ""}${momChange.pct.toFixed(1)}% vs last month`
          }
          tone={momTone}
          icon={momIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income & expense trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={monthly} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceChart data={monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top spending categories</CardTitle>
            {topCategory ? (
              <p className="text-sm text-muted-foreground">
                Top: <span className="font-bold text-foreground">{topCategory.categoryName}</span>{" "}
                at {fmt(topCategory.total)}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <CategorySpendingList data={expenseByCategory.slice(0, 8)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
