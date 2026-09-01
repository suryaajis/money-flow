"use client";

import { useEffect, useState } from "react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useBudgetStore } from "@/store/budgetStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useUIStore } from "@/store/uiStore";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/constants";
import { parseCurrencyInput } from "@/lib/utils";
import type { ApiBudget } from "@/lib/api";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

function formatCurrency(amount: number, currency: string) {
  const cfg = CURRENCIES[currency as keyof typeof CURRENCIES] ?? CURRENCIES.IDR;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
}

function BudgetProgress({
  spent,
  limit,
  currency,
}: {
  spent: number;
  limit: number;
  currency: string;
}) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent > limit && limit > 0;
  const warn = pct >= 75 && !over;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(spent, currency)} digunakan</span>
        <span
          className={
            over
              ? "text-destructive font-medium"
              : warn
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : ""
          }
        >
          {over
            ? "Melebihi anggaran!"
            : warn
              ? `${Math.round(pct)}% terpakai`
              : `Sisa ${formatCurrency(limit - spent, currency)}`}
        </span>
      </div>
      <div className="progress-flow h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${over ? "bg-destructive" : warn ? "bg-warning" : "bg-gradient-to-r from-brand-navy via-[#86a941] to-brand-lime"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const {
    budgets,
    loading,
    currentMonth,
    fetchBudgets,
    deleteBudget,
    copyFromPreviousMonth,
  } = useBudgetStore();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();
  const { currency } = useUIStore();

  const [month, setMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<ApiBudget | null>(null);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const { upsertBudget } = useBudgetStore();

  useEffect(() => {
    fetchBudgets(month);
  }, [month, fetchBudgets]);

  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both",
  );

  function getSpent(categoryId: string) {
    const [year, mon] = month.split("-").map(Number);
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.type === "expense" &&
          t.categoryId === categoryId &&
          d.getFullYear() === year &&
          d.getMonth() + 1 === mon
        );
      })
      .reduce((s, t) => s + t.amount, 0);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategoryId) {
      alert("Please select a category.");
      return;
    }
    setFormLoading(true);
    try {
      const amount = parseCurrencyInput(formAmount);
      if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        setFormLoading(false);
        return;
      }
      await upsertBudget(formCategoryId, amount, month);
      setShowForm(false);
      setEditBudget(null);
      setFormCategoryId("");
      setFormAmount("");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (b: ApiBudget) => {
    setEditBudget(b);
    setFormCategoryId(b.categoryId);
    setFormAmount(String(b.amount));
    setShowForm(true);
  };

  const monthLabel = format(parseISO(`${month}-01`), "MMMM yyyy", {
    locale: id,
  });
  const prevMonth = format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");
  const nextMonth = format(addMonths(parseISO(`${month}-01`), 1), "yyyy-MM");

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = expenseCategories.filter(
    (c) => !budgetedCategoryIds.has(c.id) || editBudget?.categoryId === c.id,
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex items-center gap-3">
        <FlowBuddy className="hidden sm:inline-flex" />
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-kicker">
            <Sparkles className="h-3.5 w-3.5" /> Rencana yang ramah
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            Budget
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Beri uangmu arah, tanpa bikin hidup terasa sempit.
          </p>
        </div>
      </div>

      {/* Month navigator */}
      <div className="glass-surface flex flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <button
            onClick={() => setMonth(prevMonth)}
            aria-label="Bulan sebelumnya"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center text-base font-semibold capitalize sm:min-w-[140px] sm:flex-none">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonth(nextMonth)}
            aria-label="Bulan berikutnya"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => copyFromPreviousMonth(month)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors sm:flex-none"
          >
            <Copy className="h-4 w-4" />
            Salin bulan lalu
          </button>
          <button
            onClick={() => {
              setEditBudget(null);
              setFormCategoryId("");
              setFormAmount("");
              setShowForm(true);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Set Budget
          </button>
        </div>
      </div>

      {/* Budget form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mf-card page-enter space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <h3 className="font-semibold">
            {editBudget ? "Edit Budget" : "Set Budget Kategori"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Kategori</label>
              <Select
                required
                value={formCategoryId}
                onValueChange={setFormCategoryId}
                disabled={!!editBudget}
                placeholder="Pilih kategori"
                options={(editBudget
                  ? expenseCategories
                  : availableCategories
                ).map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Batas anggaran
              </label>
              <CurrencyInput
                required
                value={formAmount}
                onChange={(val) => setFormAmount(val)}
                className="rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={formLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditBudget(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.035] py-12 text-center text-muted-foreground">
          <FlowBuddy className="mb-4" />
          <p className="font-medium text-foreground">
            Dompet kecilnya masih santai.
          </p>
          <p className="mt-1 text-sm">
            Belum ada budget untuk {monthLabel}. Yuk beri dia arah.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const spent = getSpent(b.categoryId);
            // The API sends the category relation, but fall back to the loaded
            // categories (and a neutral default) so a missing/deleted category
            // can never crash the whole page.
            const cat =
              b.category ?? categories.find((c) => c.id === b.categoryId);
            return (
              <div
                key={b.id}
                className="mf-card interactive-lift space-y-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
                    />
                    <span className="truncate font-medium text-sm">
                      {cat?.name ?? "Kategori dihapus"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(Number(b.amount), currency)}
                    </span>
                    <button
                      onClick={() => openEdit(b)}
                      aria-label="Edit budget"
                      className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBudget(b.id)}
                      aria-label="Hapus budget"
                      className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <BudgetProgress
                  spent={spent}
                  limit={Number(b.amount)}
                  currency={currency}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
