"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyAggregate } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AccessibleChartSummary } from "@/components/charts/AccessibleChartSummary";

interface TrendChartProps {
  data: MonthlyAggregate[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { fmt } = useCurrency();
  const reducedMotion = useReducedMotion();

  if (!mounted) return <div className="h-[320px] w-full" />;

  return (
    <div className="w-full">
      <div className="h-[320px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--income)" stopOpacity={0.42} />
              <stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.36} />
              <stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 5"
            stroke="var(--chart-grid)"
            vertical={false}
          />
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
          <Tooltip formatter={(value) => fmt(Number(value) || 0)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="income"
            name="Pemasukan"
            stroke="var(--income)"
            strokeWidth={3}
            strokeLinecap="round"
            dot={{
              r: 3,
              fill: "var(--brand-lime)",
              stroke: "var(--brand-navy)",
              strokeWidth: 1.5,
            }}
            activeDot={{
              r: 6,
              fill: "var(--brand-lime)",
              stroke: "var(--brand-navy)",
              strokeWidth: 2,
            }}
            fill="url(#incomeGradient)"
            isAnimationActive={!reducedMotion}
            animationDuration={650}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Pengeluaran"
            stroke="var(--expense)"
            strokeWidth={3}
            strokeLinecap="round"
            dot={{ r: 3, fill: "var(--brand-navy)", strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: "var(--brand-navy)", strokeWidth: 2 }}
            fill="url(#expenseGradient)"
            isAnimationActive={!reducedMotion}
            animationDuration={650}
          />
        </AreaChart>
        </ResponsiveContainer>
      </div>
      <AccessibleChartSummary
        title="Tren pemasukan dan pengeluaran"
        data={data.map((item) => ({ label: item.month, values: [
          { name: "Pemasukan", value: fmt(item.income) },
          { name: "Pengeluaran", value: fmt(item.expense) },
        ] }))}
      />
    </div>
  );
};
