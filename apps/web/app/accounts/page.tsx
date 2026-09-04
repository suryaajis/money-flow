"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Pencil, Plus, Users, WalletCards } from "lucide-react";
import { accountsApi, transfersApi, type AccountType, type ApiAccount, type ApiAccountShare, type ApiTransfer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAccountStore } from "@/store/accountStore";

const fmt = (value: number, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

function AccountCard({ account, reload }: { account: ApiAccount; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ApiAccountShare[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "contributor">("contributor");
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [editName, setEditName] = useState(account.name);
  const [editType, setEditType] = useState<AccountType>(account.type);
  const [editCurrency, setEditCurrency] = useState(account.currency);

  const loadShares = useCallback(async () => {
    if (account.ownership !== "owned") return;
    try {
      setShares(await accountsApi.getShares(account.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat akses account.");
    }
  }, [account.id, account.ownership]);

  useEffect(() => { if (open) void loadShares(); }, [open, loadShares]);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{account.name}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">{account.ownership === "owned" ? "Milik saya" : "Shared"}</span>
            {account.isDefault && <span className="rounded-full bg-brand-lime px-2 py-0.5 text-[10px] font-bold text-brand-navy">Default</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {account.type.replace("_", " ")} · {account.currency}
            {account.ownership === "shared" ? ` · Owner: ${account.owner?.name ?? "-"} · ${account.role}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Aktivitas terakhir: {account.lastActivityAt ?? "belum ada transaksi"}</p>
        </div>
        <p className="text-right text-lg font-black">{fmt(account.balance, account.currency)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {account.ownership === "owned" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}><Pencil className="h-4 w-4" /> Kelola</Button>
            {!account.isDefault && <Button size="sm" variant="ghost" onClick={async () => { await accountsApi.archive(account.id); await reload(); }}>Arsipkan</Button>}
          </>
        ) : (
          account.shareId && <Button size="sm" variant="ghost" onClick={async () => { await accountsApi.leave(account.shareId!); await reload(); }}>Tinggalkan</Button>
        )}
      </div>

      {open && account.ownership === "owned" && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Detail account</p>
            <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
            <Select value={editType} onValueChange={(value) => setEditType(value as AccountType)} options={["cash", "bank", "e_wallet", "credit_card", "other"].map((value) => ({ value, label: value.replace("_", " ") }))} />
            <Select value={editCurrency} onValueChange={setEditCurrency} options={["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "GBP"].map((value) => ({ value, label: value }))} />
            <Button size="sm" variant="outline" disabled={!editName.trim()} onClick={async () => { await accountsApi.update(account.id, { name: editName.trim(), type: editType, currency: editCurrency }); setMessage("Detail account diperbarui. Opening balance hanya dapat dikoreksi melalui adjustment."); await reload(); }}>Simpan detail</Button>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Undang melalui email</p>
            <Input type="email" placeholder="user@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Select value={role} onValueChange={(value) => setRole(value as typeof role)} options={[{ value: "viewer", label: "Viewer — hanya lihat" }, { value: "contributor", label: "Contributor — lihat & catat" }]} />
            <Button size="sm" disabled={!email} onClick={async () => {
              try { await accountsApi.invite(account.id, email, role); setEmail(""); setMessage("Undangan email dikirim."); await loadShares(); }
              catch (error) { setMessage(error instanceof Error ? error.message : "Gagal mengundang."); }
            }}>Kirim undangan</Button>
            {shares.length > 0 && <ul className="space-y-2 text-xs">{shares.filter((share) => share.status !== "revoked").map((share) => <li key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted p-2"><span>{share.member?.name ?? share.invitedEmail}<br /><span className="text-muted-foreground">{share.status}</span></span><div className="flex items-center gap-2"><Select value={share.role} onValueChange={async (nextRole) => { await accountsApi.updateShare(account.id, share.id, nextRole as "viewer" | "contributor"); await loadShares(); }} options={[{ value: "viewer", label: "Viewer" }, { value: "contributor", label: "Contributor" }]} /><button className="text-destructive" onClick={async () => { await accountsApi.revokeShare(account.id, share.id); await loadShares(); }}>Cabut</button></div></li>)}</ul>}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Koreksi saldo</p>
            <Input type="number" placeholder="Nilai + / -" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} />
            <Input placeholder="Alasan koreksi" value={reason} onChange={(event) => setReason(event.target.value)} />
            <Button size="sm" variant="outline" disabled={!adjustment || reason.length < 3} onClick={async () => { await accountsApi.adjust(account.id, Number(adjustment), reason); setAdjustment(""); setReason(""); setMessage("Adjustment tersimpan."); await reload(); }}>Simpan adjustment</Button>
          </div>
          {message && <p className="text-xs text-muted-foreground lg:col-span-3">{message}</p>}
        </div>
      )}
    </article>
  );
}

export default function AccountsPage() {
  const refreshActiveContext = useAccountStore((state) => state.fetchAccounts);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [transfers, setTransfers] = useState<ApiTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [accountForm, setAccountForm] = useState({ name: "", type: "bank" as AccountType, currency: "IDR", openingBalance: "0" });
  const [transferForm, setTransferForm] = useState({ sourceAccountId: "", destinationAccountId: "", amount: "", destinationAmount: "", exchangeRate: "", date: new Date().toISOString().slice(0, 10), notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountRows, transferRows] = await Promise.all([accountsApi.getAll(), transfersApi.getAll()]);
      setAccounts(accountRows);
      setTransfers(transferRows);
      await refreshActiveContext();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat accounts.");
    } finally { setLoading(false); }
  }, [refreshActiveContext]);
  useEffect(() => { void load(); }, [load]);
  const owned = useMemo(() => accounts.filter((account) => account.ownership === "owned" && !account.archivedAt), [accounts]);
  const shared = useMemo(() => accounts.filter((account) => account.ownership === "shared"), [accounts]);
  const totals = useMemo(() => {
    const values = new Map<string, { assets: number; liabilities: number }>();
    for (const account of owned) {
      const current = values.get(account.currency) ?? { assets: 0, liabilities: 0 };
      if (account.type === "credit_card") current.liabilities += Math.abs(account.balance);
      else current.assets += account.balance;
      values.set(account.currency, current);
    }
    return [...values.entries()];
  }, [owned]);
  const sourceAccount = owned.find((account) => account.id === transferForm.sourceAccountId);
  const destinationAccount = owned.find((account) => account.id === transferForm.destinationAccountId);
  const crossCurrency = !!sourceAccount && !!destinationAccount && sourceAccount.currency !== destinationAccount.currency;
  useEffect(() => {
    if (owned.some((account) => account.id === activeAccountId)) {
      setTransferForm((current) => ({
        ...current,
        sourceAccountId: activeAccountId ?? "",
      }));
    }
  }, [activeAccountId, owned]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-kicker">Account foundation</p><h2 className="mt-1 text-3xl font-black">Accounts & Pocket</h2><p className="mt-1 text-sm text-muted-foreground">Saldo per account, transfer, dan kolaborasi berbasis email.</p></div>
        <Link href="/accounts/invitations"><Button variant="outline"><Users className="h-4 w-4" /> Undangan</Button></Link>
      </div>

      {!!totals.length && <section className="grid gap-3 sm:grid-cols-2">{totals.map(([currency, total]) => <div key={currency} className="rounded-2xl border bg-card p-4"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ringkasan {currency}</p><div className="mt-2 flex justify-between gap-4"><span>Aset kas <strong className="block">{fmt(total.assets, currency)}</strong></span><span className="text-right">Liability <strong className="block">{fmt(total.liabilities, currency)}</strong></span></div></div>)}</section>}

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-5">
        <div className="md:col-span-5"><h3 className="font-bold"><Plus className="mr-2 inline h-4 w-4" />Buat account</h3></div>
        <Input placeholder="Nama account" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} />
        <Select value={accountForm.type} onValueChange={(type) => setAccountForm({ ...accountForm, type: type as AccountType })} options={["cash", "bank", "e_wallet", "credit_card", "other"].map((value) => ({ value, label: value.replace("_", " ") }))} />
        <Select value={accountForm.currency} onValueChange={(currency) => setAccountForm({ ...accountForm, currency })} options={["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "GBP"].map((value) => ({ value, label: value }))} />
        <Input type="number" placeholder="Opening balance" value={accountForm.openingBalance} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })} />
        <Button disabled={!accountForm.name} onClick={async () => { await accountsApi.create({ name: accountForm.name, type: accountForm.type, currency: accountForm.currency, openingBalance: Number(accountForm.openingBalance) }); setAccountForm({ name: "", type: "bank", currency: "IDR", openingBalance: "0" }); await load(); }}><WalletCards className="h-4 w-4" /> Tambah</Button>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Memuat account…</p> : <div className="space-y-7"><section><h3 className="mb-3 text-lg font-black">Account Saya</h3><div className="grid gap-4 lg:grid-cols-2">{owned.map((account) => <AccountCard key={account.id} account={account} reload={load} />)}</div></section><section><h3 className="mb-3 text-lg font-black">Dibagikan ke Saya</h3>{shared.length ? <div className="grid gap-4 lg:grid-cols-2">{shared.map((account) => <AccountCard key={account.id} account={account} reload={load} />)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada account yang dibagikan kepadamu.</p>}</section></div>}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold"><ArrowRightLeft className="mr-2 inline h-4 w-4" />Transfer antar-account</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={transferForm.sourceAccountId} onValueChange={(value) => setTransferForm({ ...transferForm, sourceAccountId: value })} placeholder="Dari" options={owned.map((account) => ({ value: account.id, label: account.name }))} />
          <Select value={transferForm.destinationAccountId} onValueChange={(value) => setTransferForm({ ...transferForm, destinationAccountId: value })} placeholder="Ke" options={owned.map((account) => ({ value: account.id, label: account.name }))} />
          <Input type="number" placeholder="Nominal" value={transferForm.amount} onChange={(event) => setTransferForm({ ...transferForm, amount: event.target.value })} />
          <Input type="date" value={transferForm.date} onChange={(event) => setTransferForm({ ...transferForm, date: event.target.value })} />
          <Button disabled={!transferForm.sourceAccountId || !transferForm.destinationAccountId || !transferForm.amount || (crossCurrency && (!transferForm.destinationAmount || !transferForm.exchangeRate))} onClick={async () => {
            await transfersApi.create({ sourceAccountId: transferForm.sourceAccountId, destinationAccountId: transferForm.destinationAccountId, sourceAmount: Number(transferForm.amount), destinationAmount: crossCurrency ? Number(transferForm.destinationAmount) : Number(transferForm.amount), exchangeRate: crossCurrency ? Number(transferForm.exchangeRate) : 1, date: transferForm.date, notes: transferForm.notes || null, idempotencyKey: crypto.randomUUID() });
            setTransferForm({ sourceAccountId: "", destinationAccountId: "", amount: "", destinationAmount: "", exchangeRate: "", date: new Date().toISOString().slice(0, 10), notes: "" }); setMessage("Transfer berhasil dicatat."); await load();
          }}>Transfer</Button>
        </div>
        {crossCurrency && <div className="grid gap-3 rounded-xl bg-muted p-3 sm:grid-cols-2"><Input type="number" placeholder={`Nominal diterima (${destinationAccount?.currency})`} value={transferForm.destinationAmount} onChange={(event) => setTransferForm({ ...transferForm, destinationAmount: event.target.value })} /><Input type="number" placeholder={`Kurs 1 ${sourceAccount?.currency} ke ${destinationAccount?.currency}`} value={transferForm.exchangeRate} onChange={(event) => setTransferForm({ ...transferForm, exchangeRate: event.target.value })} /><p className="text-xs text-muted-foreground sm:col-span-2">Konfirmasi nominal asal, nominal tujuan, dan kurs. Ketiganya disimpan bersama transfer.</p></div>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {transfers.length > 0 && <div className="space-y-2">{transfers.slice(0, 8).map((transfer) => <div key={transfer.id} className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm"><span>{transfer.sourceAccount?.name} → {transfer.destinationAccount?.name}<br /><span className="text-xs text-muted-foreground">{transfer.date}</span></span><span className="font-semibold">{fmt(transfer.sourceAmount, transfer.sourceAccount?.currency)}</span></div>)}</div>}
      </section>
    </div>
  );
}
