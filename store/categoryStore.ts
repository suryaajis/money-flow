import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category } from "@/lib/types";
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from "@/lib/constants";
import { uid } from "@/lib/utils";

type NewCategory = Omit<Category, "id" | "isDefault">;

interface CategoryState {
  categories: Category[];
  hasHydrated: boolean;

  addCategory: (input: NewCategory) => Category;
  updateCategory: (id: string, patch: Partial<NewCategory>) => void;
  deleteCategory: (id: string) => void;
  resetToDefaults: () => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      hasHydrated: false,

      addCategory: (input) => {
        const cat: Category = { ...input, id: uid("cat"), isDefault: false };
        set((state) => ({ categories: [...state.categories, cat] }));
        return cat;
      },

      updateCategory: (id, patch) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deleteCategory: (id) => {
        // Default categories cannot be deleted to keep the seed data coherent.
        const target = get().categories.find((c) => c.id === id);
        if (!target || target.isDefault) return;
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
      },

      resetToDefaults: () => set({ categories: DEFAULT_CATEGORIES }),
    }),
    {
      name: STORAGE_KEYS.categories,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ categories: state.categories }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
