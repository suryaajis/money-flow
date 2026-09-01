"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryAggregate } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { EmptyState } from "@/components/shared/EmptyState";
import { PieChart as PieChartIcon } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AccessibleChartSummary } from "@/components/charts/AccessibleChartSummary";

interface CategoryPieChartProps {
  data: CategoryAggregate[];
}

const PLAYFUL_PALETTE = [
  "var(--brand-lime)",
  "var(--brand-navy)",
  "#86a941",
  "#e0f2bd",
  "#b6c0a8",
];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { fmt } = useCurrency();
  const reducedMotion = useReducedMotion();

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieChartIcon className="h-5 w-5" />}
        title="Belum ada pengeluaran"
        description="Tambahkan transaksi pengeluaran untuk melihat distribusi kategori."
      />
    );
  }

  return (
    <div className="grid min-w-0 items-center gap-4 md:grid-cols-2">
      <div className="h-[220px] min-w-0 w-full" aria-hidden="true">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="categoryName"
                innerRadius="43%"
                outerRadius="70%"
                paddingAngle={2}
                stroke="var(--card)"
                cornerRadius={5}
                isAnimationActive={!reducedMotion}
                animationDuration={650}
              >
                {data.map((d, index) => (
                  <Cell
                    key={d.categoryId}
                    fill={PLAYFUL_PALETTE[index % PLAYFUL_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => fmt(Number(value) || 0)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {data.slice(0, 6).map((d, index) => (
          <li
            key={d.categoryId}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    PLAYFUL_PALETTE[index % PLAYFUL_PALETTE.length],
                }}
                aria-hidden
              />
              <span className="truncate">{d.categoryName}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
              <span>{fmt(d.total)}</span>
              <span className="text-xs w-10 text-right">
                {d.percentage.toFixed(0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="md:col-span-2">
        <AccessibleChartSummary
          title="Distribusi pengeluaran per kategori"
          data={data.map((item) => ({ label: item.categoryName, values: [
            { name: "Total", value: fmt(item.total) },
            { name: "Persentase", value: `${item.percentage.toFixed(0)}%` },
          ] }))}
        />
      </div>
    </div>
  );
};
