import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Transaction, TransactionFilters } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { generateSampleTransactions } from "@/lib/mockData";

type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

interface TransactionState {
  transactions: Transaction[];
  filters: TransactionFilters;
  hasHydrated: boolean;

  addTransaction: (input: NewTransaction) => Transaction;
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteMany: (ids: string[]) => void;

  setFilters: (patch: Partial<TransactionFilters>) => void;
  resetFilters: () => void;

  resetWithSampleData: () => void;
  clearAll: () => void;
}

const DEFAULT_FILTERS: TransactionFilters = { type: "all" };

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      filters: DEFAULT_FILTERS,
      hasHydrated: false,

      addTransaction: (input) => {
        const now = new Date().toISOString();
        const tx: Transaction = {
          ...input,
          id: uid("tx"),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ transactions: [tx, ...state.transactions] }));
        return tx;
      },

      updateTransaction: (id, patch) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...patch, updatedAt: new Date().toISOString() } : tx,
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }));
      },

      deleteMany: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({ transactions: state.transactions.filter((tx) => !idSet.has(tx.id)) }));
      },

      setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      resetWithSampleData: () => set({ transactions: generateSampleTransactions() }),
      clearAll: () => set({ transactions: [] }),
    }),
    {
      name: STORAGE_KEYS.transactions,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ transactions: state.transactions }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
