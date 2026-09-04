"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { accountsApi, type ApiAccount } from "@/lib/api";
import { useUIStore } from "@/store/uiStore";
import type { CurrencyCode } from "@/lib/types";

interface AccountState {
  accounts: ApiAccount[];
  activeAccountId: string | null;
  loading: boolean;
  fetchAccounts: () => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<void>;
  clearAll: () => void;
}

const syncCurrency = (account?: ApiAccount) => {
  if (account) useUIStore.getState().setCurrency(account.currency as CurrencyCode);
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      activeAccountId: null,
      loading: false,
      fetchAccounts: async () => {
        set({ loading: true });
        try {
          const [accounts, active] = await Promise.all([
            accountsApi.getAll(),
            accountsApi.getActive(),
          ]);
          const selected =
            accounts.find((account) => account.id === active.accountId && !account.archivedAt) ??
            accounts.find((account) => account.isDefault && !account.archivedAt) ??
            accounts.find((account) => !account.archivedAt);
          set({ accounts, activeAccountId: selected?.id ?? null });
          syncCurrency(selected);
        } catch {
          // Keep the persisted selection while offline. Stale authentication
          // is handled centrally by the API client.
        } finally {
          set({ loading: false });
        }
      },
      setActiveAccount: async (accountId) => {
        const account = get().accounts.find(
          (candidate) => candidate.id === accountId && !candidate.archivedAt,
        );
        if (!account) throw new Error("Pocket tidak tersedia");
        await accountsApi.setActive(accountId);
        set({ activeAccountId: accountId });
        syncCurrency(account);
      },
      clearAll: () => set({ accounts: [], activeAccountId: null, loading: false }),
    }),
    {
      name: "mf:active-pocket",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
      }),
    },
  ),
);
