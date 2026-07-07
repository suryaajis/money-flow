"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";
import type { Transaction } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type SortKey = "date" | "amount" | "type";
type SortDir = "asc" | "desc";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

const PAGE_SIZE = 15;

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading = false,
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

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Memuat transaksi...</span>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions match your filters"
        description="Try widening your date range or clearing filters."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 w-10">
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
              <th className="px-3 py-2 font-medium">Category</th>
              <SortableHeader
                label="Type"
                active={sortKey === "type"}
                dir={sortDir}
                onClick={() => setSort("type")}
              />
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Tags</th>
              <SortableHeader
                label="Amount"
                active={sortKey === "amount"}
                dir={sortDir}
                onClick={() => setSort("amount")}
                align="right"
              />
              <th className="px-3 py-2 w-20" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tx) => {
              const cat = getCategory(tx.categoryId);
              const isIncome = tx.type === "income";
              return (
                <tr key={tx.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2.5 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`Select transaction ${tx.id}`}
                      checked={selected.has(tx.id)}
                      onChange={() => toggleRow(tx.id)}
                      className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                    />
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap text-muted-foreground">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {cat ? <CategoryBadge category={cat} /> : <span className="text-muted-foreground">Unknown</span>}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle max-w-[280px] truncate text-muted-foreground">
                    {tx.notes || "—"}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {tx.tags && tx.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 align-middle text-right tabular-nums font-medium whitespace-nowrap",
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {fmtSigned(tx.amount, tx.type)}
                    {tx.currency && tx.currency !== "IDR" && (
                      <span className="ml-1 text-xs text-muted-foreground">≈ {tx.currency}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right">
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
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            Page {safePage + 1} of {pageCount} · {sorted.length} transactions
          </span>
          <div className="flex gap-1">
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
  <th className={cn("px-3 py-2 font-medium select-none", align === "right" && "text-right")}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
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
