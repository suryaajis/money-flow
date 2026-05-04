"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import type { Category } from "@/lib/types";

export const CategoryList: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { transactions } = useTransactions();

  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<Category | null>(null);

  // Quick lookup of how many transactions each category has, for context.
  const usageById = useMemo(() => {
    const m = new Map<string, number>();
    for (const tx of transactions) m.set(tx.categoryId, (m.get(tx.categoryId) ?? 0) + 1);
    return m;
  }, [transactions]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {categories.length} categories. Default categories cannot be deleted.
        </p>
        <Button onClick={() => setAdding(true)}>New category</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const usage = usageById.get(c.id) ?? 0;
          return (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CategoryBadge category={c} />
                    <p className="text-xs text-muted-foreground capitalize">
                      {c.type === "both" ? "Income & expense" : c.type}
                      {" · "}
                      {usage} {usage === 1 ? "transaction" : "transactions"}
                    </p>
                    {c.isDefault ? (
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Default
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => setEditing(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.name}`}
                      disabled={c.isDefault}
                      onClick={() => setConfirming(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="New category">
        <CategoryForm
          onSubmit={(values) => {
            addCategory(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit category">
        {editing ? (
          <CategoryForm
            initial={editing}
            onSubmit={(values) => {
              updateCategory(editing.id, values);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirming !== null}
        title="Delete category?"
        description={
          confirming
            ? `"${confirming.name}" will be removed. Transactions in this category will keep referencing it but will display as Unknown.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirming) deleteCategory(confirming.id);
        }}
        onClose={() => setConfirming(null)}
      />
    </>
  );
};
