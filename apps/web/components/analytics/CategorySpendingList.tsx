"use client";

import type { CategoryAggregate } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { EmptyState } from "@/components/shared/EmptyState";

interface CategorySpendingListProps {
  data: CategoryAggregate[];
  emptyLabel?: string;
}

export const CategorySpendingList: React.FC<CategorySpendingListProps> = ({
  data,
  emptyLabel = "Belum ada data untuk periode ini.",
}) => {
  const { fmt } = useCurrency();

  if (data.length === 0) {
    return <EmptyState title="Tidak ada data" description={emptyLabel} />;
  }

  return (
    <ul className="space-y-3">
      {data.map((row) => (
        <li key={row.categoryId} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate font-medium">{row.categoryName}</span>
            </div>
            <div className="flex gap-3 text-muted-foreground tabular-nums">
              <span>{fmt(row.total)}</span>
              <span className="text-xs w-10 text-right">
                {row.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={row.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(100, row.percentage)}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
