"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useRecurringStore } from "@/store/recurringStore";
import { useCategoryStore } from "@/store/categoryStore";
import type { ApiRecurring, CreateRecurringInput } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  editing: ApiRecurring | null;
}

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const today = () => new Date().toISOString().split("T")[0];

function emptyForm(): FormState {
  return {
    amount: "",
    type: "expense",
    categoryId: "",
    frequency: "monthly",
    startDate: today(),
    endDate: "",
    notes: "",
  };
}

interface FormState {
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate: string;
  notes: string;
}

export function RecurringModal({ open, onClose, editing }: Props) {
  const { addRecurring, updateRecurring } = useRecurringStore();
  const { categories } = useCategoryStore();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        amount: String(editing.amount),
        type: editing.type,
        categoryId: editing.categoryId ?? "",
        frequency: editing.frequency,
        startDate: editing.startDate,
        endDate: editing.endDate ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      setForm(emptyForm());
    }
    setError(null);
  }, [editing, open]);

  if (!open) return null;

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === "both",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!form.startDate) {
      setError("Start date is required.");
      return;
    }

    const payload: CreateRecurringInput = {
      amount,
      type: form.type,
      categoryId: form.categoryId || null,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notes: form.notes || null,
      isActive: true,
    };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateRecurring(editing.id, payload);
      } else {
        await addRecurring(payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">
            {editing ? "Edit Recurring" : "New Recurring Transaction"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Type */}
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex gap-2">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, type: t, categoryId: "" }))
                  }
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                    form.type === t
                      ? t === "income"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={labelCls}>
              Amount
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputCls}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className={labelCls}>
              Category
            </label>
            <select
              id="category"
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: e.target.value }))
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="frequency" className={labelCls}>
              Frequency
            </label>
            <select
              id="frequency"
              value={form.frequency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  frequency: e.target.value as FormState["frequency"],
                }))
              }
              className={inputCls}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start / End Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startDate" className={labelCls}>
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputCls}
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className={labelCls}>
                End Date <span className="text-muted-foreground">(opt.)</span>
              </label>
              <input
                id="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={labelCls}>
              Notes <span className="text-muted-foreground">(opt.)</span>
            </label>
            <input
              id="notes"
              type="text"
              placeholder="e.g. Gaji bulanan"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
