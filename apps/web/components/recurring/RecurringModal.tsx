"use client";

import { useEffect, useState } from "react";
import { useRecurringStore } from "@/store/recurringStore";
import { useCategoryStore } from "@/store/categoryStore";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Modal } from "@/components/shared/Modal";
import type { ApiRecurring, CreateRecurringInput } from "@/lib/api";
import { cn, parseCurrencyInput } from "@/lib/utils";

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
    const amount = parseCurrencyInput(form.amount);
    if (!amount || amount <= 0) {
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
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Recurring" : "New Recurring Transaction"}
    >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <CurrencyInput
              id="amount"
              placeholder="0"
              value={form.amount}
              onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
              className={inputCls}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className={labelCls}>
              Category
            </label>
            <Select
              id="category"
              value={form.categoryId}
              onValueChange={(categoryId) =>
                setForm((f) => ({ ...f, categoryId }))
              }
              options={[
                { value: "", label: "— None —" },
                ...filteredCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="frequency" className={labelCls}>
              Frequency
            </label>
            <Select
              id="frequency"
              value={form.frequency}
              onValueChange={(frequency) =>
                setForm((f) => ({
                  ...f,
                  frequency: frequency as FormState["frequency"],
                }))
              }
              options={FREQUENCIES.map((frequency) => ({
                value: frequency.value,
                label: frequency.label,
              }))}
            />
          </div>

          {/* Start / End Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className={labelCls}>
                Start Date
              </label>
              <DatePicker
                id="startDate"
                value={form.startDate}
                onValueChange={(startDate) =>
                  setForm((f) => ({ ...f, startDate }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className={labelCls}>
                End Date <span className="text-muted-foreground">(opt.)</span>
              </label>
              <DatePicker
                id="endDate"
                value={form.endDate}
                min={form.startDate}
                onValueChange={(endDate) =>
                  setForm((f) => ({ ...f, endDate }))
                }
                placeholder="Opsional"
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
    </Modal>
  );
}
