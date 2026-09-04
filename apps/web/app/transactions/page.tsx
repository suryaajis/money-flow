"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterBar } from "@/components/transactions/FilterBar";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { useExport } from "@/hooks/useExport";
import { sharedWalletApi } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import { useAccountStore } from "@/store/accountStore";

export default function TransactionsPage() {
  const {
    filtered,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMany,
  } = useTransactions();
  const { exportXLSX, exportCSV } = useExport();
  const accounts = useAccountStore((state) => state.accounts);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);
  const activeAccount = accounts.find((account) => account.id === activeAccountId);
  const canWrite = !!activeAccount && activeAccount.role !== "viewer";
  const canManage = activeAccount?.ownership === "owned";

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  // SHARE-04: resolve recordedBy ids to names for shared-wallet attribution
  const [recorders, setRecorders] = useState<Record<string, string>>({});

  useEffect(() => {
    sharedWalletApi
      .getRecorders()
      .then((list) =>
        setRecorders(Object.fromEntries(list.map((r) => [r.id, r.name]))),
      )
      .catch(() => setRecorders({}));
  }, []);

  // Open the add modal when arriving from the mobile FAB (/transactions?add=1),
  // then strip the query so a refresh doesn't reopen it. Read from
  // window.location to avoid needing a useSearchParams Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("add") === "1" && canWrite) {
      setAdding(true);
      window.history.replaceState(null, "", "/transactions");
    }
  }, [canWrite]);

  const handleSubmit = async (values: TransactionFormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateTransaction(editing.id, values);
        setEditing(null);
      } else {
        await addTransaction(values);
        setAdding(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-kicker">
            <Sparkles className="h-3.5 w-3.5" /> Ledger harian
          </p>
          <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            Transaksi
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ledger {activeAccount?.name ?? "active pocket"}{activeAccount?.role === "viewer" ? " · mode viewer" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportXLSX(filtered)}
            disabled={filtered.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => setAdding(true)} disabled={!canWrite}>
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-brand-navy/15 bg-card/90">
        <CardContent className="p-5 sm:p-6">
          <FilterBar />
        </CardContent>
      </Card>

      {canManage && selected.size > 0 ? (
        <div className="glass-surface page-enter flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 shadow-lg">
          <span className="text-sm">
            <strong>{selected.size}</strong> selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirming(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      <TransactionTable
        transactions={filtered}
        loading={loading}
        onEdit={(tx) => setEditing(tx)}
        onDelete={(tx) => setConfirming(tx)}
        selected={selected}
        onSelectionChange={setSelected}
        recorders={recorders}
        readOnly={!canManage}
      />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add transaction"
      >
        <TransactionForm
          onSubmit={handleSubmit}
          onCancel={() => setAdding(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit transaction"
      >
        {editing ? (
          <TransactionForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirming !== null}
        title="Delete transaction?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirming) await deleteTransaction(confirming.id);
        }}
        onClose={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={bulkConfirming}
        title={`Delete ${selected.size} transactions?`}
        description="This action cannot be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={async () => {
          await deleteMany([...selected]);
          setSelected(new Set());
        }}
        onClose={() => setBulkConfirming(false)}
      />
    </div>
  );
}
