"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategorySpendingList } from "@/components/analytics/CategorySpendingList";
import { InsightCard } from "@/components/analytics/InsightCard";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { useTransactions } from "@/hooks/useTransactions";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrency } from "@/hooks/useCurrency";
import type { Transaction } from "@/lib/types";

const RANGES = [
  { label: "3 bulan terakhir", months: 3 },
  { label: "6 bulan terakhir", months: 6 },
  { label: "12 bulan terakhir", months: 12 },
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
          <h2 className="text-xl font-semibold tracking-tight">Analitik</h2>
          <p className="text-sm text-muted-foreground">
            Tren dan wawasan keuangan pada periode yang dipilih.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="range">Periode</Label>
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
          label="Saldo bersih"
          value={fmt(summary.totalBalance)}
          tone={summary.totalBalance >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <InsightCard
          label="Pemasukan"
          value={fmt(summary.totalIncome)}
          tone="positive"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <InsightCard
          label="Pengeluaran"
          value={fmt(summary.totalExpense)}
          tone="negative"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <InsightCard
          label="Bulan ini vs bulan lalu"
          value={
            momChange === null
              ? "—"
              : `${momChange.delta >= 0 ? "+" : ""}${fmt(momChange.delta)}`
          }
          delta={
            momChange === null
              ? undefined
              : momChange.pct === null
                ? "vs bulan lalu"
                : `${momChange.pct >= 0 ? "+" : ""}${momChange.pct.toFixed(1)}% vs bulan lalu`
          }
          tone={momTone}
          icon={momIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren pemasukan & pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={monthly} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceChart data={monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kategori pengeluaran terbesar</CardTitle>
            {topCategory ? (
              <p className="text-sm text-muted-foreground">
                Tertinggi: <span className="font-medium text-foreground">{topCategory.categoryName}</span>{" "}
                sebesar {fmt(topCategory.total)}
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
