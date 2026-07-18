import { create } from "zustand";
import { categoriesApi, type ApiCategory } from "@/lib/api";

export type Category = ApiCategory;

type NewCategory = Omit<ApiCategory, "id" | "isDefault">;

interface CategoryState {
  categories: Category[];
  loading: boolean;
  hasLoaded: boolean;

  fetchCategories: () => Promise<void>;
  addCategory: (input: NewCategory) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<NewCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearAll: () => void;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [],
  loading: false,
  hasLoaded: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const categories = await categoriesApi.getAll();
      set({ categories, hasLoaded: true });
    } catch {
      // A stale-session 401 is already handled globally in lib/api (evict +
      // redirect). Swallow here so the fire-and-forget call in AppShell can't
      // surface as an unhandled promise rejection.
    } finally {
      set({ loading: false });
    }
  },

  addCategory: async (input) => {
    const cat = await categoriesApi.create(input);
    set((state) => ({ categories: [...state.categories, cat] }));
    return cat;
  },

  updateCategory: async (id, patch) => {
    const updated = await categoriesApi.update(id, patch);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCategory: async (id) => {
    const target = get().categories.find((c) => c.id === id);
    if (!target || target.isDefault) return;
    await categoriesApi.delete(id);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },

  clearAll: () => set({ categories: [], hasLoaded: false }),
}));
