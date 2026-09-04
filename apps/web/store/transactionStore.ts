import { create } from "zustand";
import type { TransactionFilters } from "@/lib/types";
import { transactionsApi, type ApiTransaction } from "@/lib/api";

export type Transaction = ApiTransaction;

type NewTransaction = Omit<ApiTransaction, "id" | "createdAt" | "updatedAt" | "category">;

interface TransactionState {
  transactions: Transaction[];
  filters: TransactionFilters;
  loading: boolean;
  hasLoaded: boolean;

  fetchTransactions: () => Promise<boolean>;
  addTransaction: (input: NewTransaction) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;

  setFilters: (patch: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
  clearAll: () => void;
}

const DEFAULT_FILTERS: TransactionFilters = { type: "all" };

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],
  filters: DEFAULT_FILTERS,
  loading: false,
  hasLoaded: false,

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const transactions = await transactionsApi.getAll();
      set({ transactions, hasLoaded: true });
      return true;
    } catch {
      // A stale-session 401 is already handled globally in lib/api (evict +
      // redirect). Return the failure so DataBootstrap can retry without
      // surfacing an unhandled promise rejection from AppShell.
      return false;
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (input) => {
    const tx = await transactionsApi.create(input);
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    return tx;
  },

  updateTransaction: async (id, patch) => {
    const updated = await transactionsApi.update(id, patch);
    set((state) => ({
      transactions: state.transactions.map((tx) => (tx.id === id ? updated : tx)),
    }));
  },

  deleteTransaction: async (id) => {
    await transactionsApi.delete(id);
    set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }));
  },

  deleteMany: async (ids) => {
    await transactionsApi.bulkDelete(ids);
    const idSet = new Set(ids);
    set((state) => ({ transactions: state.transactions.filter((tx) => !idSet.has(tx.id)) }));
  },

  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  clearAll: () => set({ transactions: [], hasLoaded: false }),
}));
