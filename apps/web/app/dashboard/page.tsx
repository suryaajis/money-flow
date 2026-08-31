"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverviewWidget } from "@/components/dashboard/BudgetOverviewWidget";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useBudgetStore } from "@/store/budgetStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { TiltSurface } from "@/components/motion/TiltSurface";
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
    <div className="space-y-5 sm:space-y-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FlowBuddy
            className="hidden sm:inline-flex"
            label="Flow, teman finansialmu"
          />
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Financial check-in
            </p>
            <h2 className="truncate text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
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

      <div className="grid gap-4 lg:grid-cols-5">
        <TiltSurface className="hero-vault min-h-[250px] rounded-[1.5rem] p-6 text-white lg:col-span-3 sm:p-8">
          <div className="hero-vault-content flex h-full min-h-[202px] flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-indigo-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/12">
                    <Wallet className="h-3.5 w-3.5" />
                  </span>
                  Total saldo
                </p>
                <p
                  data-numeric
                  className="mt-3 break-words text-[clamp(2rem,6vw,3.5rem)] font-bold leading-none tracking-[-0.055em]"
                >
                  {fmt(summary.totalBalance)}
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-50 backdrop-blur">
                Live overview
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-indigo-100/75">
                  Aktivitas tersimpan
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {summary.transactionCount} transaksi · tetap bertumbuh ✨
                </p>
              </div>
              <Link
                href="/analytics"
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/18"
              >
                Lihat analitik <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </TiltSurface>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Arus kas
            </p>
            <CardTitle>Uangmu bergerak ke mana?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Perbandingan pemasukan dan pengeluaran enam bulan terakhir.
            </p>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthly} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Peta pengeluaran
            </p>
            <CardTitle>Si paling boros bulan ini</CardTitle>
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
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Budget bulan ini</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sedikit pagar supaya rencana tetap di jalurnya.
            </p>
          </CardHeader>
          <CardContent>
            <BudgetOverviewWidget />
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Ledger terbaru
            </p>
            <CardTitle className="mt-1">Jejak uang terakhir</CardTitle>
          </div>
          <Link
            href="/transactions"
            className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
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
