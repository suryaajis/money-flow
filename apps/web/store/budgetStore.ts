import { create } from "zustand";
import { budgetsApi, type ApiBudget } from "@/lib/api";
import { format } from "date-fns";

interface BudgetState {
  budgets: ApiBudget[];
  loading: boolean;
  currentMonth: string;
  fetchBudgets: (month?: string) => Promise<void>;
  upsertBudget: (categoryId: string, amount: number, month: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  copyFromPreviousMonth: (month: string) => Promise<void>;
  clearAll: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  currentMonth: format(new Date(), "yyyy-MM"),

  fetchBudgets: async (month) => {
    set({ loading: true });
    try {
      const m = month ?? get().currentMonth;
      const budgets = await budgetsApi.getAll(m);
      set({ budgets, currentMonth: m });
    } catch {
      // Stale-session 401 handled globally in lib/api; swallow so the
      // fire-and-forget call in DashboardPage can't become an unhandled
      // rejection.
    } finally {
      set({ loading: false });
    }
  },

  upsertBudget: async (categoryId, amount, month) => {
    const updated = await budgetsApi.upsert({ categoryId, amount, month });
    set((s) => {
      const existing = s.budgets.findIndex((b) => b.id === updated.id || (b.categoryId === updated.categoryId && b.month === updated.month));
      if (existing >= 0) {
        const next = [...s.budgets];
        next[existing] = updated;
        return { budgets: next };
      }
      return { budgets: [...s.budgets, updated] };
    });
  },

  deleteBudget: async (id) => {
    await budgetsApi.delete(id);
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
  },

  copyFromPreviousMonth: async (month) => {
    const budgets = await budgetsApi.copyPrevious(month);
    set({ budgets });
  },

  clearAll: () => set({ budgets: [], currentMonth: format(new Date(), "yyyy-MM") }),
}));
