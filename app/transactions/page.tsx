"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionForm, type TransactionFormValues } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { useExport } from "@/hooks/useExport";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsClient />
    </Suspense>
  );
}

function TransactionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    filtered,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMany,
  } = useTransactions();
  const { exportXLSX, exportCSV } = useExport();

  // Lazy initializer reads `?new=1` once on mount (used by the mobile FAB
  // on every other page) — avoids the React-19 "no setState in effect" rule
  // by deriving initial state synchronously rather than calling setAdding
  // from inside useEffect.
  const [adding, setAdding] = useState<boolean>(
    () => searchParams.get("new") === "1",
  );
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Once the modal has been opened from `?new=1`, scrub the param from the
  // URL so a refresh doesn't re-open the modal forever. This effect doesn't
  // call setState — it only mutates the URL via the router.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace("/transactions");
    }
  }, [searchParams, router]);

  const handleSubmit = (values: TransactionFormValues) => {
    if (editing) {
      updateTransaction(editing.id, values);
      setEditing(null);
    } else {
      addTransaction(values);
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add, edit, and review your income and expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportXLSX(filtered)} disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <FilterBar />
        </CardContent>
      </Card>

      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-primary-soft/40 px-4 py-2.5">
          <span className="text-sm font-semibold">
            <strong>{selected.size}</strong> selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkConfirming(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      <TransactionTable
        transactions={filtered}
        onEdit={(tx) => setEditing(tx)}
        onDelete={(tx) => setConfirming(tx)}
        selected={selected}
        onSelectionChange={setSelected}
      />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add transaction" description="A little more for the wallet?">
        <TransactionForm onSubmit={handleSubmit} onCancel={() => setAdding(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction">
        {editing ? (
          <TransactionForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirming !== null}
        title="Delete transaction?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirming) deleteTransaction(confirming.id);
        }}
        onClose={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={bulkConfirming}
        title={`Delete ${selected.size} transactions?`}
        description="This action cannot be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={() => {
          deleteMany([...selected]);
          setSelected(new Set());
        }}
        onClose={() => setBulkConfirming(false)}
      />
    </div>
  );
}
