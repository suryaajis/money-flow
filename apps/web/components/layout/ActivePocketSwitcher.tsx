"use client";

import { Eye, WalletCards } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useAccountStore } from "@/store/accountStore";
import { useTransactionStore } from "@/store/transactionStore";

export function ActivePocketSwitcher() {
  const accounts = useAccountStore((state) => state.accounts);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);
  const loading = useAccountStore((state) => state.loading);
  const setActiveAccount = useAccountStore((state) => state.setActiveAccount);
  const available = accounts.filter((account) => !account.archivedAt);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-lime/70 text-brand-navy lg:flex">
        <WalletCards className="h-4 w-4" />
      </span>
      <Select
        aria-label="Active pocket"
        className="w-[8rem] sm:w-[13rem]"
        buttonClassName="h-9 border-brand-navy/15 bg-card px-2.5 text-xs sm:h-10 sm:text-sm"
        value={activeAccountId ?? ""}
        disabled={loading || available.length === 0}
        placeholder={loading ? "Memuat pocket…" : "Pilih pocket"}
        onValueChange={(accountId) => {
          void setActiveAccount(accountId).then(() => {
            useTransactionStore.getState().setFilters({ accountId: undefined });
          }).catch(() => {});
        }}
        options={available.map((account) => ({
          value: account.id,
          label: (
            <span className="flex min-w-0 items-center gap-1.5">
              {account.role === "viewer" ? <Eye className="h-3.5 w-3.5 shrink-0" /> : null}
              <span className="truncate">{account.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {account.currency}{account.ownership === "shared" ? " · Shared" : ""}
              </span>
            </span>
          ),
        }))}
      />
    </div>
  );
}
