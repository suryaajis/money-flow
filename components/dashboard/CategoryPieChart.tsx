"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryAggregate } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { EmptyState } from "@/components/shared/EmptyState";

interface CategoryPieChartProps {
  data: CategoryAggregate[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { fmt } = useCurrency();

  if (data.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Add an expense transaction to see your spending breakdown."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 items-center">
      <div className="h-[260px] w-full">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="categoryName"
                innerRadius={60}
                outerRadius={96}
                paddingAngle={3}
                cornerRadius={6}
                stroke="var(--card)"
                strokeWidth={3}
              >
                {data.map((d) => (
                  <Cell key={d.categoryId} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => fmt(Number(value) || 0)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="space-y-2.5 text-sm">
        {data.slice(0, 6).map((d) => (
          <li key={d.categoryId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="inline-block h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-card"
                style={{ backgroundColor: d.color }}
                aria-hidden
              />
              <span className="truncate font-medium">{d.categoryName}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{fmt(d.total)}</span>
              <span className="text-xs w-10 text-right font-bold text-primary">
                {d.percentage.toFixed(0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
