"use client";

import { useEffect, useState } from "react";
import {
  Repeat,
  Plus,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useRecurringStore } from "@/store/recurringStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useProcessOverdueRecurring } from "@/hooks/useProcessOverdueRecurring";
import { RecurringModal } from "@/components/recurring/RecurringModal";
import type { ApiRecurring } from "@/lib/api";
import { cn } from "@/lib/utils";

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function RecurringPage() {
  useProcessOverdueRecurring();

  const {
    recurrings,
    loading,
    hasLoaded,
    fetchRecurrings,
    toggleActive,
    deleteRecurring,
  } = useRecurringStore();
  const { categories } = useCategoryStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRecurring | null>(null);

  useEffect(() => {
    if (!hasLoaded) fetchRecurrings();
  }, [hasLoaded, fetchRecurrings]);

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return "—";
    return categories.find((c) => c.id === categoryId)?.name ?? "—";
  }

  function handleEdit(item: ApiRecurring) {
    setEditing(item);
    setModalOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this recurring template? Already-generated transactions will not be deleted.",
      )
    )
      return;
    await deleteRecurring(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sekali atur, lanjut mengalir
          </p>
          <h2 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
            Transaksi Berulang
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gaji, tagihan, dan langganan rutin—biar Flow yang ingat.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && recurrings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.035] py-16 text-center">
          <Repeat className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No recurring templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create one to automatically log regular income or expenses.
          </p>
          <button
            onClick={handleNew}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create first template
          </button>
        </div>
      )}

      {recurrings.length > 0 && (
        <div className="mf-card divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {recurrings.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-primary/[0.03]",
                !item.isActive && "opacity-50",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      item.type === "income"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {item.type}
                  </span>
                  <span className="text-sm font-semibold">
                    {Number(item.amount).toLocaleString("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {FREQ_LABELS[item.frequency]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Category: {getCategoryName(item.categoryId)}</span>
                  <span>Next: {item.nextRunDate}</span>
                  {item.endDate && <span>Until: {item.endDate}</span>}
                  {item.notes && (
                    <span className="truncate max-w-[200px]">{item.notes}</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleActive(item.id, !item.isActive)}
                  title={item.isActive ? "Pause" : "Resume"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.isActive ? (
                    <PauseCircle className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  title="Edit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RecurringModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  );
}
