"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { useTransactionStore } from "@/store/transactionStore";
import { CURRENCIES } from "@/lib/constants";
import type { Transaction, TransactionType, CurrencyCode } from "@/lib/types";
import { todayISO, parseCurrencyInput } from "@/lib/utils";

export interface TransactionFormValues {
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  notes?: string;
  currency?: CurrencyCode | null;
  tags?: string[];
}

interface TransactionFormProps {
  initial?: Transaction;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initial, onSubmit, onCancel, submitting = false }) => {
  const { categories } = useCategories();
  const { transactions: allTransactions } = useTransactionStore();

  const allUsedTags = useMemo(() => {
    const set = new Set<string>();
    for (const tx of allTransactions) {
      for (const tag of tx.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [allTransactions]);

  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [date, setDate] = useState<string>(initial?.date ?? todayISO());
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const currency: CurrencyCode = "IDR";
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormValues, string>>>({});

  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    const query = tagInput.startsWith("#") ? tagInput : `#${tagInput}`;
    return allUsedTags.filter((t) => t.startsWith(query) && !tags.includes(t)).slice(0, 6);
  }, [tagInput, allUsedTags, tags]);

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

  const addTag = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, "").trim();
    if (!trimmed) return;
    const tag = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",")) {
      addTag(val.slice(0, -1));
    } else {
      setTagInput(val);
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};

    const parsed = parseCurrencyInput(amount);
    if (!amount || parsed <= 0) {
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
      currency,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={
                type === "expense"
                  ? "h-10 rounded-md border border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium"
                  : "h-10 rounded-md border border-border bg-card text-sm text-muted-foreground hover:bg-accent"
              }
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={
                type === "income"
                  ? "h-10 rounded-md border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                  : "h-10 rounded-md border border-border bg-card text-sm text-muted-foreground hover:bg-accent"
              }
            >
              Income
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Amount</Label>
          <CurrencyInput
            id="tx-amount"
            placeholder="0"
            value={amount}
            onChange={(val) => setAmount(val)}
          />
          {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Date</Label>
          <DatePicker
            id="tx-date"
            value={date}
            onValueChange={setDate}
            max={todayISO()}
            required
          />
          {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tx-currency">Transaction currency</Label>
          <Select
            id="tx-currency"
            value={currency}
            onValueChange={() => {}}
            options={[
              {
                value: CURRENCIES.IDR.code,
                label: `${CURRENCIES.IDR.code} (${CURRENCIES.IDR.symbol})`,
              },
            ]}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Untuk saat ini pencatatan transaksi menggunakan Rupiah Indonesia.
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tx-category">Category</Label>
          <Select
            id="tx-category"
            value={selectedCategoryId}
            onValueChange={setCategoryId}
            options={
              validCategories.length === 0
                ? [
                    {
                      value: "",
                      label: "No categories available",
                      disabled: true,
                    },
                  ]
                : validCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))
            }
          />
          {errors.categoryId ? (
            <p className="text-xs text-destructive">{errors.categoryId}</p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tx-tags">Tags (optional)</Label>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() => removeTag(tag)}
                    className="hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <Input
              id="tx-tags"
              placeholder="Add tag..."
              value={tagInput}
              onChange={handleTagChange}
              onKeyDown={handleTagKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />
            {showSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                {tagSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
};
