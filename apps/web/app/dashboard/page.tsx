"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverviewWidget } from "@/components/dashboard/BudgetOverviewWidget";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useBudgetStore } from "@/store/budgetStore";

export default function DashboardPage() {
  const { summary, monthly, expenseByCategory } = useAnalytics({ months: 6 });
  const { budgets, fetchBudgets } = useBudgetStore();

  // Fetch budgets for the current month on mount
  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  return (
    <div className="space-y-6">
      {/* Hero greeting card */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary-soft via-card to-card border-primary/20">
        <CardContent className="p-5 sm:p-6 flex items-center gap-4">
          <div className="text-primary hidden sm:block">
            <CatMascot className="h-20 w-20 sm:h-24 sm:w-24" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="sm:hidden text-2xl" aria-hidden>
                {greeting.emoji}
              </span>
              Overview
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{greeting.message}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                {fmt(summary.totalBalance)}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                · {summary.transactionCount} transactions
              </span>
            </div>
          </div>
          <Link href="/transactions" className="hidden sm:inline-flex">
            <Button>
              <PawIcon className="h-4 w-4" /> Add transaction
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total Balance"
          amount={summary.totalBalance}
          tone="neutral"
          icon={<Wallet className="h-5 w-5" />}
          hint={`${summary.transactionCount} transactions`}
        />
        <SummaryCard
          label="Total Income"
          amount={summary.totalIncome}
          tone="income"
          icon={<HappyCatIcon className="h-5 w-5" />}
        />
        <SummaryCard
          label="Total Expense"
          amount={summary.totalExpense}
          tone="expense"
          icon={<SadCatIcon className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly income vs expense</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={expenseByCategory} />
          </CardContent>
        </Card>
      </div>

      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget this month</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetOverviewWidget />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between flex">
          <CardTitle>Recent transactions</CardTitle>
          <Link
            href="/transactions"
            className="text-xs font-bold text-primary hover:underline"
          >
            See all
          </Link>
        </CardHeader>
        <CardContent>
          <RecentTransactions />
        </CardContent>
      </Card>
    </div>
  );
}
