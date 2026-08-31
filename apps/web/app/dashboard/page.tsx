"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverviewWidget } from "@/components/dashboard/BudgetOverviewWidget";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { QuickActionDock } from "@/components/dashboard/QuickActionDock";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useBudgetStore } from "@/store/budgetStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

export default function DashboardPage() {
  const { summary, monthly, expenseByCategory } = useAnalytics({ months: 6 });
  const { budgets, fetchBudgets } = useBudgetStore();
  const user = useAuthStore((state) => state.user);
  const { fmt } = useCurrency();

  // Fetch budgets for the current month on mount
  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FlowBuddy
            className="hidden sm:inline-flex"
            label="Flow, teman finansialmu"
          />
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-foreground/55">
              <Sparkles className="h-3.5 w-3.5 text-brand-lime [filter:drop-shadow(0_0_0.5px_#151515)]" /> Money check-in
            </p>
            <h2 className="truncate text-3xl font-black tracking-[-0.065em] text-foreground sm:text-4xl">
              Halo, {user?.name?.split(" ")[0] ?? "teman"}!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Yuk lihat aliran uangmu hari ini—pelan-pelan jadi rapi.
            </p>
          </div>
        </div>
        <Link href="/transactions" className="hidden sm:inline-flex">
          <Button>
            <Plus className="h-4 w-4" /> Tambah transaksi
          </Button>
        </Link>
      </div>

      <div className="motion-stagger grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <BalanceHero
            balance={fmt(summary.totalBalance)}
            transactionCount={summary.transactionCount}
          />
        </div>

        <div className="motion-stagger grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
          <SummaryCard
            label="Total pemasukan"
            amount={summary.totalIncome}
            tone="income"
            icon={<ArrowUpRight className="h-4 w-4" />}
            hint="Yang masuk, kita sambut baik-baik"
          />
          <SummaryCard
            label="Total pengeluaran"
            amount={summary.totalExpense}
            tone="expense"
            icon={<ArrowDownLeft className="h-4 w-4" />}
            hint="Yang keluar, tetap kita awasi"
          />
        </div>
      </div>

      <QuickActionDock />

      <div className="motion-stagger grid gap-5 lg:grid-cols-5">
        <Card className="neo-cutout interactive-lift overflow-hidden border-brand-navy/15 lg:col-span-3">
          <CardHeader>
            <p className="w-fit rounded-full bg-brand-lime px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand-navy">
              Arus kas
            </p>
            <CardTitle className="text-xl font-black tracking-[-0.045em]">Uangmu bergerak ke mana?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Perbandingan pemasukan dan pengeluaran enam bulan terakhir.
            </p>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthly} />
          </CardContent>
        </Card>
        <Card className="neo-cutout interactive-lift overflow-hidden border-brand-navy/15 bg-accent lg:col-span-2">
          <CardHeader>
            <p className="w-fit rounded-full bg-brand-navy px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand-lime">
              Peta pengeluaran
            </p>
            <CardTitle className="text-xl font-black tracking-[-0.045em]">Si paling boros bulan ini</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tenang, tahu polanya adalah langkah pertama.
            </p>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={expenseByCategory} />
          </CardContent>
        </Card>
      </div>

      {budgets.length > 0 && (
        <Card className="neo-cutout interactive-lift overflow-hidden border-brand-navy/15">
          <CardHeader>
            <CardTitle className="text-xl font-black tracking-[-0.04em]">Budget bulan ini</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sedikit pagar supaya rencana tetap di jalurnya.
            </p>
          </CardHeader>
          <CardContent>
            <BudgetOverviewWidget />
          </CardContent>
        </Card>
      )}

      <Card className="neo-cutout interactive-lift overflow-hidden border-brand-navy/15">
        <CardHeader className="flex-row items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">
              Ledger terbaru
            </p>
            <CardTitle className="mt-1 text-xl font-black tracking-[-0.04em]">Jejak uang terakhir</CardTitle>
          </div>
          <Link
            href="/transactions"
            className="focus-ring wiggle-on-hover inline-flex items-center gap-1 rounded-xl bg-brand-lime px-3 py-1.5 text-xs font-black text-brand-navy transition-transform hover:-rotate-1 hover:scale-105"
          >
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <RecentTransactions />
        </CardContent>
      </Card>
    </div>
  );
}
