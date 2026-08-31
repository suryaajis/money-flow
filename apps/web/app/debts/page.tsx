"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HandCoins,
  Plus,
  CheckCircle2,
  Clock,
  Undo2,
  Trash2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { debtsApi, type ApiDebt, type CreateDebtInput } from "@/lib/api";
import { parseCurrencyInput } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const isOverdue = (debt: ApiDebt) =>
  !debt.settledAt && debt.dueDate && new Date(debt.dueDate) < new Date();

function DebtForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (data: CreateDebtInput) => Promise<void>;
  onCancel: () => void;
  initial?: Partial<CreateDebtInput>;
}) {
  const [direction, setDirection] = useState<"owed_to_me" | "i_owe">(
    initial?.direction ?? "owed_to_me",
  );
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [counterpartyName, setCounterpartyName] = useState(
    initial?.counterpartyName ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        direction,
        amount: parseCurrencyInput(amount),
        counterpartyName,
        notes: notes || undefined,
        dueDate: dueDate || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["owed_to_me", "i_owe"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
              direction === d
                ? d === "owed_to_me"
                  ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-border text-muted-foreground"
            }`}
          >
            {d === "owed_to_me"
              ? "💰 Piutang (Mereka Hutang)"
              : "💸 Hutang (Aku Hutang)"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Nama</label>
          <input
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            placeholder="Nama orang"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Jumlah</label>
          <CurrencyInput
            value={amount}
            onChange={(val) => setAmount(val)}
            placeholder="0"
            className="rounded-md border border-border focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Jatuh Tempo (opsional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Catatan (opsional)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Untuk apa..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}

function DebtCard({
  debt,
  onSettle,
  onUnsettle,
  onDelete,
}: {
  debt: ApiDebt;
  onSettle: (id: string) => void;
  onUnsettle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const overdue = isOverdue(debt);
  const isPiutang = debt.direction === "owed_to_me";

  return (
    <div
      className={`mf-card interactive-lift rounded-2xl border p-4 space-y-2 ${overdue ? "border-expense/50 bg-expense-soft/30" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${isPiutang ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {isPiutang ? "💰 Piutang" : "💸 Hutang"}
            </span>
            {debt.settledAt && (
              <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5">
                Lunas
              </span>
            )}
            {overdue && (
              <span className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 rounded-full px-2 py-0.5">
                Jatuh tempo
              </span>
            )}
          </div>
          <p className="font-semibold text-base mt-0.5">
            {debt.counterpartyName}
          </p>
          <p
            className={`text-lg font-bold ${isPiutang ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {isPiutang ? "+" : "-"}
            {fmt(Number(debt.amount))}
          </p>
          {debt.notes && (
            <p className="text-xs text-muted-foreground">{debt.notes}</p>
          )}
          {debt.dueDate && (
            <p
              className={`text-xs flex items-center gap-1 mt-1 ${overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
            >
              <Clock className="h-3 w-3" />
              Jatuh tempo: {new Date(debt.dueDate).toLocaleDateString("id-ID")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!debt.settledAt ? (
            <button
              onClick={() => onSettle(debt.id)}
              title="Tandai lunas"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-green-600 hover:bg-green-500/10"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onUnsettle(debt.id)}
              title="Batalkan lunas"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(debt.id)}
            title="Hapus"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<ApiDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"active" | "settled">("active");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await debtsApi.getAll();
      setDebts(data);
    } catch {
      setError("Gagal memuat data hutang piutang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = debts.filter((d) => !d.settledAt);
  const settled = debts.filter((d) => !!d.settledAt);
  const displayed = tab === "active" ? active : settled;

  const totalPiutang = active
    .filter((d) => d.direction === "owed_to_me")
    .reduce((s, d) => s + Number(d.amount), 0);
  const totalHutang = active
    .filter((d) => d.direction === "i_owe")
    .reduce((s, d) => s + Number(d.amount), 0);
  const overduePiutang = active.filter(
    (d) => d.direction === "owed_to_me" && isOverdue(d),
  ).length;
  const overdueHutang = active.filter(
    (d) => d.direction === "i_owe" && isOverdue(d),
  ).length;

  async function handleCreate(data: CreateDebtInput) {
    await debtsApi.create(data);
    setShowForm(false);
    await load();
  }

  async function handleSettle(id: string) {
    await debtsApi.settle(id);
    await load();
  }

  async function handleUnsettle(id: string) {
    await debtsApi.unsettle(id);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan hutang/piutang ini?")) return;
    await debtsApi.delete(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <HandCoins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Janji yang tetap tercatat
            </p>
            <h1 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
              Hutang Piutang
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              Biar hubungan tetap hangat, catatannya tetap jelas.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          {showForm ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showForm ? "Tutup" : "Tambah"}
        </button>
      </div>

      {showForm && (
        <div className="mf-card page-enter rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Catat Baru</h2>
          <DebtForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="mf-card rounded-2xl border border-income/30 bg-income-soft/30 p-4">
          <p className="text-xs text-muted-foreground">Piutang aktif</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {fmt(totalPiutang)}
          </p>
          {overduePiutang > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {overduePiutang} jatuh tempo
            </p>
          )}
        </div>
        <div className="mf-card rounded-2xl border border-expense/30 bg-expense-soft/30 p-4">
          <p className="text-xs text-muted-foreground">Hutang aktif</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {fmt(totalHutang)}
          </p>
          {overdueHutang > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {overdueHutang} jatuh tempo
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1.5">
        {(["active", "settled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t === "active"
              ? `Aktif (${active.length})`
              : `Lunas (${settled.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Memuat...
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive text-sm">{error}</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HandCoins className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {tab === "active"
              ? "Tidak ada hutang/piutang aktif"
              : "Belum ada yang lunas"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onSettle={handleSettle}
              onUnsettle={handleUnsettle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
