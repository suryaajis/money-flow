"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{categories.length}</span> categories.
          Default categories can&apos;t be deleted.
        </p>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const usage = usageById.get(c.id) ?? 0;
          return (
            <Card key={c.id} className="cat-card-hover relative overflow-hidden">
              {/* Color accent strip on the left edge */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: c.color }}
              />
              <CardContent className="p-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <CategoryBadge category={c} />
                    <p className="text-xs text-muted-foreground capitalize font-medium">
                      {c.type === "both" ? "Income & expense" : c.type}
                      {" · "}
                      <span className="text-foreground font-bold">{usage}</span>{" "}
                      {usage === 1 ? "transaction" : "transactions"}
                    </p>
                    {c.isDefault ? (
                      <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
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

      <Modal open={adding} onClose={() => setAdding(false)} title="New category" description="Pick a name and color for your new category.">
        <CategoryForm
          onSubmit={async (values) => {
            await addCategory(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit category">
        {editing ? (
          <CategoryForm
            initial={editing}
            onSubmit={async (values) => {
              await updateCategory(editing.id, values);
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
        onConfirm={async () => {
          if (confirming) await deleteCategory(confirming.id);
        }}
        onClose={() => setConfirming(null)}
      />
    </>
  );
};
