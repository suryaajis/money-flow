"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function DashboardPage() {
  const { summary, monthly, expenseByCategory } = useAnalytics({ months: 6 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            A snapshot of your finances across all transactions.
          </p>
        </div>
        <Link href="/transactions" className="hidden sm:inline-flex">
          <Button>Add transaction</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total Balance"
          amount={summary.totalBalance}
          tone="neutral"
          icon={<Wallet className="h-4 w-4" />}
          hint={`${summary.transactionCount} transactions`}
        />
        <SummaryCard
          label="Total Income"
          amount={summary.totalIncome}
          tone="income"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <SummaryCard
          label="Total Expense"
          amount={summary.totalExpense}
          tone="expense"
          icon={<ArrowDownLeft className="h-4 w-4" />}
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

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions />
        </CardContent>
      </Card>
    </div>
  );
}
