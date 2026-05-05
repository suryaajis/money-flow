"use client";

import { CategoryList } from "@/components/categories/CategoryList";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Categories</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organize transactions with categories. Pick colors that read well in your charts.
        </p>
      </div>
      <CategoryList />
    </div>
  );
}
