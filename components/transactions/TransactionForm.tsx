"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HappyCatIcon, SadCatIcon } from "@/components/shared/CatIcons";
import { useCategories } from "@/hooks/useCategories";
import type { Transaction, TransactionType } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

export interface TransactionFormValues {
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  notes?: string;
}

interface TransactionFormProps {
  initial?: Transaction;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initial, onSubmit, onCancel }) => {
  const { categories } = useCategories();

  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [date, setDate] = useState<string>(initial?.date ?? todayISO());
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormValues, string>>>({});

  // Only show categories valid for the chosen type. Default to first match.
  const validCategories = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "both"),
    [categories, type],
  );

  // Whenever the type changes, ensure the selected category is still valid.
  const selectedCategoryId = useMemo(() => {
    if (categoryId && validCategories.some((c) => c.id === categoryId)) return categoryId;
    return validCategories[0]?.id ?? "";
  }, [categoryId, validCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};

    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      next.amount = "Enter a positive amount.";
    }
    if (!selectedCategoryId) {
      next.categoryId = "Pick a category.";
    }
    if (!date) {
      next.date = "Pick a date.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      amount: Math.round(parsed * 100) / 100,
      type,
      categoryId: selectedCategoryId,
      date,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <TypeToggle
              active={type === "expense"}
              tone="expense"
              onClick={() => setType("expense")}
            />
            <TypeToggle
              active={type === "income"}
              tone="income"
              onClick={() => setType("income")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Amount</Label>
          <Input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Date</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
          />
          {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="tx-category">Category</Label>
          <Select
            id="tx-category"
            value={selectedCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {validCategories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              validCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </Select>
          {errors.categoryId ? (
            <p className="text-xs text-destructive">{errors.categoryId}</p>
          ) : null}
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="tx-notes">Notes (optional)</Label>
          <Textarea
            id="tx-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was this for?"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add transaction"}</Button>
      </div>
    </form>
  );
};

interface TypeToggleProps {
  active: boolean;
  tone: TransactionType;
  onClick: () => void;
}

const TypeToggle: React.FC<TypeToggleProps> = ({ active, tone, onClick }) => {
  const isIncome = tone === "income";
  const Icon = isIncome ? HappyCatIcon : SadCatIcon;
  const label = isIncome ? "Income" : "Expense";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95",
        active
          ? isIncome
            ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40"
            : "border-rose-400 bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:border-primary/30",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};
