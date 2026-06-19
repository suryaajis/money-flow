"use client";

import { useState } from "react";
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
  const {
    filtered,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMany,
  } = useTransactions();
  const { exportXLSX, exportCSV } = useExport();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, and review your income and expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportXLSX(filtered)} disabled={filtered.length === 0}>
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
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm">
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
        loading={loading}
        onEdit={(tx) => setEditing(tx)}
        onDelete={(tx) => setConfirming(tx)}
        selected={selected}
        onSelectionChange={setSelected}
      />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add transaction">
        <TransactionForm onSubmit={handleSubmit} onCancel={() => setAdding(false)} submitting={submitting} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction">
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
