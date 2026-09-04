"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import type { Category } from "@/lib/types";

const TYPE_LABELS = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  both: "Pemasukan & pengeluaran",
} as const;

export const CategoryList: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } =
    useCategories();
  const { allTransactions: transactions } = useTransactions();

  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<Category | null>(null);

  const usageById = useMemo(() => {
    const usage = new Map<string, number>();
    for (const transaction of transactions) {
      if (!transaction.categoryId) continue;
      usage.set(
        transaction.categoryId,
        (usage.get(transaction.categoryId) ?? 0) + 1,
      );
    }
    return usage;
  }, [transactions]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-border/80 bg-card/65 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-bold tracking-[-0.02em]">
            {categories.length} kategori tersedia
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kategori bawaan tetap aman dan tidak dapat dihapus.
          </p>
        </div>
        <Button
          className="self-start sm:self-auto"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" /> Kategori baru
        </Button>
      </div>

      <div className="motion-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const usage = usageById.get(category.id) ?? 0;

          return (
            <Card
              key={category.id}
              className="interactive-lift group overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-y-5 left-0 z-[2] w-1 rounded-r-full transition-[width] duration-200 group-hover:w-1.5"
                style={{ backgroundColor: category.color }}
              />
              <span
                aria-hidden
                className="absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-[0.08] transition-transform duration-300 group-hover:scale-125"
                style={{ backgroundColor: category.color }}
              />

              <CardContent className="!p-5 sm:!p-6">
                <div className="flex min-h-[7.75rem] flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <CategoryBadge
                      category={category}
                      className="px-3 py-1 text-xs font-bold"
                    />
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="border border-border/70 bg-background/55 text-muted-foreground hover:border-brand-lime/70 hover:text-foreground"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => setEditing(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="border border-border/70 bg-background/55 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Hapus ${category.name}`}
                        disabled={category.isDefault}
                        onClick={() => setConfirming(category)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-border/65 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Digunakan pada
                      </p>
                      <p className="mt-1 text-sm font-bold tracking-[-0.02em]">
                        <span className="text-lg tabular-nums">{usage}</span>{" "}
                        transaksi
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {TYPE_LABELS[category.type]}
                      </p>
                      {category.isDefault ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-kicker">
                          <ShieldCheck className="h-3 w-3" /> Bawaan
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-blue">
                          Kustom
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Kategori baru"
      >
        <CategoryForm
          onSubmit={async (values) => {
            await addCategory(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit kategori"
      >
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
        title="Hapus kategori?"
        description={
          confirming
            ? `"${confirming.name}" akan dihapus. Transaksi lama tetap tersimpan, tetapi kategorinya akan ditampilkan sebagai tidak diketahui.`
            : undefined
        }
        confirmLabel="Hapus"
        destructive
        onConfirm={async () => {
          if (confirming) await deleteCategory(confirming.id);
        }}
        onClose={() => setConfirming(null)}
      />
    </>
  );
};
