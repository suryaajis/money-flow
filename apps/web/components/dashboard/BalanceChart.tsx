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
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface BalanceChartProps {
  data: MonthlyAggregate[];
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { fmt } = useCurrency();
  const reducedMotion = useReducedMotion();

  if (!mounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          <Tooltip
            formatter={(value) => fmt(Number(value) || 0)}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="income"
            name="Pemasukan"
            fill="var(--income)"
            radius={[8, 8, 3, 3]}
            isAnimationActive={!reducedMotion}
          />
          <Bar
            dataKey="expense"
            name="Pengeluaran"
            fill="var(--expense)"
            radius={[8, 8, 3, 3]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
