"use client";

import { useCallback, useMemo } from "react";
import { useCategoryStore } from "@/store/categoryStore";
import type { Category } from "@/lib/types";

export function useCategories() {
  const categories = useCategoryStore((s) => s.categories);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const resetToDefaults = useCategoryStore((s) => s.resetToDefaults);

  // Lookup map for fast joins with transactions.
  const byId = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const getCategory = useCallback(
    (id: string): Category | undefined => byId.get(id),
    [byId],
  );

  return {
    categories,
    byId,
    getCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults,
  };
}
