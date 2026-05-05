"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyAggregate } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";

interface BalanceChartProps {
  data: MonthlyAggregate[];
}

// Soft pastel pair — easier on the eyes, on-theme.
const INCOME_COLOR = "#6ee7b7"; // mint
const EXPENSE_COLOR = "#fca5a5"; // soft coral

export const BalanceChart: React.FC<BalanceChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { fmt } = useCurrency();

  if (!mounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmt(v, { compact: true })}
            width={70}
          />
          <Tooltip
            formatter={(value) => fmt(Number(value) || 0)}
            cursor={{ fill: "var(--primary-soft)", opacity: 0.5 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[10, 10, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
