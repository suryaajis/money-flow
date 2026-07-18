"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, UserMinus, CheckCircle2, Clock, AlertCircle, PlusCircle, X } from "lucide-react";
import { sharedWalletApi, type ApiWalletMember, type ApiCategory } from "@/lib/api";

// SHARE-03: inline form for a member to record a transaction into an owner's wallet.
function RecordToWallet({ ownerId, ownerName }: { ownerId: string; ownerName: string }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    setDone(null);
    if (next && cats.length === 0) {
      try {
        setCats(await sharedWalletApi.getOwnerCategories(ownerId));
      } catch {
        // ignore
      }
    }
  }

  const options = cats.filter(c => c.type === type || c.type === "both");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !categoryId) return;
    setSaving(true);
    setDone(null);
    try {
      await sharedWalletApi.recordForOwner(ownerId, {
        amount: parseFloat(amount),
        type,
        categoryId,
        date: new Date().toISOString().split("T")[0],
        notes: notes || undefined,
      });
      setDone(`Tercatat di dompet ${ownerName}.`);
      setAmount("");
      setNotes("");
    } catch {
      setDone("Gagal mencatat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {open ? <X className="h-3 w-3" /> : <PlusCircle className="h-3 w-3" />}
        {open ? "Tutup" : "Catat transaksi"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-2 space-y-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(""); }}
                className={`flex-1 rounded-md border py-1 text-xs font-medium ${
                  type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {t === "expense" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Jumlah"
              min="0"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              required
            />
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              required
            >
              <option value="">Kategori…</option>
              {options.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan ke dompet ini"}
          </button>
          {done && <p className="text-xs text-muted-foreground">{done}</p>}
        </form>
      )}
    </div>
  );
}

export default function SharedWalletPage() {
  const [myMembers, setMyMembers] = useState<ApiWalletMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<ApiWalletMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [acceptToken, setAcceptToken] = useState("");
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [members, shared] = await Promise.all([
        sharedWalletApi.getMyMembers(),
        sharedWalletApi.getSharedWithMe(),
      ]);
      setMyMembers(members);
      setSharedWithMe(shared);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    try {
      await sharedWalletApi.invite(inviteEmail.trim());
      setMessage({ type: "success", text: `Undangan dikirim ke ${inviteEmail}` });
      setInviteEmail("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message ?? "Gagal mengirim undangan." });
    } finally {
      setInviting(false);
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptToken.trim()) return;
    setAccepting(true);
    setMessage(null);
    try {
      await sharedWalletApi.accept(acceptToken.trim());
      setMessage({ type: "success", text: "Berhasil bergabung ke dompet bersama!" });
      setAcceptToken("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message ?? "Token tidak valid atau sudah digunakan." });
    } finally {
      setAccepting(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Hapus akses ${name}?`)) return;
    try {
      await sharedWalletApi.removeMember(id);
      await load();
    } catch {
      setMessage({ type: "error", text: "Gagal menghapus anggota." });
    }
  }

  async function handleLeave(id: string, ownerName: string) {
    if (!confirm(`Tinggalkan dompet bersama dengan ${ownerName}?`)) return;
    try {
      await sharedWalletApi.leave(id);
      await load();
    } catch {
      setMessage({ type: "error", text: "Gagal meninggalkan dompet." });
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Dompet Bersama</h1>
          <p className="text-sm text-muted-foreground">Bagikan akses lihat transaksi dengan pasangan atau keluarga</p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Invite section */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Undang Anggota
        </h2>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <button
            type="submit"
            disabled={inviting}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {inviting ? "..." : "Undang"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Anggota yang diundang bisa melihat semua transaksi kamu tapi tidak bisa mengubahnya.
        </p>
      </div>

      {/* My members */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Anggota Dompetku ({myMembers.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : myMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada anggota.</p>
        ) : (
          <ul className="space-y-2">
            {myMembers.map(m => (
              <li key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {m.member?.name ?? m.memberEmail ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {m.acceptedAt ? (
                      <><CheckCircle2 className="h-3 w-3 text-green-500" /> Aktif</>
                    ) : (
                      <><Clock className="h-3 w-3" /> Menunggu konfirmasi</>
                    )}
                    {!m.acceptedAt && m.inviteToken && (
                      <span className="ml-2 font-mono text-xs bg-muted px-1 rounded">
                        Token: {m.inviteToken.slice(0, 8)}...
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(m.id, m.member?.name ?? m.memberEmail ?? "anggota ini")}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Hapus akses"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shared with me */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Dompet yang Dibagikan ke Saya ({sharedWithMe.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : sharedWithMe.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada dompet yang dibagikan ke kamu.</p>
        ) : (
          <ul className="space-y-2">
            {sharedWithMe.map(m => (
              <li key={m.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.owner?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{m.owner?.email}</p>
                  </div>
                  <button
                    onClick={() => handleLeave(m.id, m.owner?.name ?? "pemilik")}
                    className="text-xs text-muted-foreground hover:text-destructive underline"
                  >
                    Tinggalkan
                  </button>
                </div>
                {m.owner?.id && (
                  <RecordToWallet ownerId={m.owner.id} ownerName={m.owner.name} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Accept invite section */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Terima Undangan</h2>
        <form onSubmit={handleAccept} className="flex gap-2">
          <input
            value={acceptToken}
            onChange={e => setAcceptToken(e.target.value)}
            placeholder="Token undangan (64 karakter)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <button
            type="submit"
            disabled={accepting}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {accepting ? "..." : "Terima"}
          </button>
        </form>
      </div>
    </div>
  );
}
