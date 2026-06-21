import { create } from "zustand";
import {
  recurringApi,
  type ApiRecurring,
  type CreateRecurringInput,
  type UpdateRecurringInput,
} from "@/lib/api";

interface RecurringState {
  recurrings: ApiRecurring[];
  loading: boolean;
  hasLoaded: boolean;

  fetchRecurrings: () => Promise<void>;
  addRecurring: (input: CreateRecurringInput) => Promise<ApiRecurring>;
  updateRecurring: (
    id: string,
    patch: UpdateRecurringInput,
  ) => Promise<ApiRecurring>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  clearAll: () => void;
}

export const useRecurringStore = create<RecurringState>()((set, get) => ({
  recurrings: [],
  loading: false,
  hasLoaded: false,

  fetchRecurrings: async () => {
    set({ loading: true });
    try {
      const recurrings = await recurringApi.getAll();
      set({ recurrings, hasLoaded: true });
    } finally {
      set({ loading: false });
    }
  },

  addRecurring: async (input) => {
    const item = await recurringApi.create(input);
    set((state) => ({ recurrings: [item, ...state.recurrings] }));
    return item;
  },

  updateRecurring: async (id, patch) => {
    const updated = await recurringApi.update(id, patch);
    set((state) => ({
      recurrings: state.recurrings.map((r) => (r.id === id ? updated : r)),
    }));
    return updated;
  },

  toggleActive: async (id, isActive) => {
    const updated = await recurringApi.update(id, { isActive });
    set((state) => ({
      recurrings: state.recurrings.map((r) => (r.id === id ? updated : r)),
    }));
  },

  deleteRecurring: async (id) => {
    await recurringApi.delete(id);
    set((state) => ({
      recurrings: state.recurrings.filter((r) => r.id !== id),
    }));
  },

  clearAll: () => set({ recurrings: [], hasLoaded: false }),
}));
