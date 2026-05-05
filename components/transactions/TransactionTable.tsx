"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { HappyCatIcon, SadCatIcon } from "@/components/shared/CatIcons";
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";
import type { Transaction } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type SortKey = "date" | "amount" | "type";
type SortDir = "asc" | "desc";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

const PAGE_SIZE = 15;

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  selected,
  onSelectionChange,
}) => {
  const { getCategory } = useCategories();
  const { fmtSigned } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = a.type.localeCompare(b.type);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [transactions, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const togglePageSelection = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    onSelectionChange(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "amount" ? "desc" : "desc");
    }
    setPage(0);
  };

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions match your filters"
        description="Even the cat is napping. Try widening your date range or clearing filters."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_-2px_rgba(251,146,60,0.08)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select page"
                  checked={allOnPageSelected}
                  onChange={togglePageSelection}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
              </th>
              <SortableHeader
                label="Date"
                active={sortKey === "date"}
                dir={sortDir}
                onClick={() => setSort("date")}
              />
              <th className="px-3 py-3 font-bold text-xs uppercase tracking-wider">Category</th>
              <SortableHeader
                label="Type"
                active={sortKey === "type"}
                dir={sortDir}
                onClick={() => setSort("type")}
              />
              <th className="px-3 py-3 font-bold text-xs uppercase tracking-wider">Notes</th>
              <SortableHeader
                label="Amount"
                active={sortKey === "amount"}
                dir={sortDir}
                onClick={() => setSort("amount")}
                align="right"
              />
              <th className="px-3 py-3 w-20" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tx) => {
              const cat = getCategory(tx.categoryId);
              const isIncome = tx.type === "income";
              return (
                <tr
                  key={tx.id}
                  className="border-t border-border hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`Select transaction ${tx.id}`}
                      checked={selected.has(tx.id)}
                      onChange={() => toggleRow(tx.id)}
                      className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                    />
                  </td>
                  <td className="px-3 py-3 align-middle whitespace-nowrap text-muted-foreground">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    {cat ? <CategoryBadge category={cat} /> : <span className="text-muted-foreground">Unknown</span>}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold",
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500 dark:text-rose-400",
                      )}
                    >
                      {isIncome ? (
                        <HappyCatIcon className="h-4 w-4" />
                      ) : (
                        <SadCatIcon className="h-4 w-4" />
                      )}
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle max-w-[280px] truncate text-muted-foreground">
                    {tx.notes || "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 align-middle text-right tabular-nums font-bold whitespace-nowrap",
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500 dark:text-rose-400",
                    )}
                  >
                    {fmtSigned(tx.amount, tx.type)}
                  </td>
                  <td className="px-3 py-3 align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => onEdit(tx)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => onDelete(tx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-semibold">
            Page {safePage + 1} of {pageCount} · {sorted.length} transactions
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, active, dir, onClick, align = "left" }) => (
  <th className={cn("px-3 py-3 select-none", align === "right" && "text-right")}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors font-bold text-xs uppercase tracking-wider",
        active && "text-foreground",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  </th>
);
