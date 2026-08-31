"use client";

import { CategoryList } from "@/components/categories/CategoryList";
import { Palette, Sparkles } from "lucide-react";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="neo-sticker flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-lime text-brand-navy">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-kicker">
            <Sparkles className="h-3.5 w-3.5" /> Warna-warni yang berguna
          </p>
          <h2 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
            Kategori
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rapikan transaksi dengan warna yang mudah dikenali.
          </p>
        </div>
      </div>
      <CategoryList />
    </div>
  );
}
