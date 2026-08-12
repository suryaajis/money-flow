"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, KeyRound, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCategoryStore } from "@/store/categoryStore";
import { profileApi, ApiError } from "@/lib/api";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, setAuth, token, logout } = useAuthStore();
  const clearTx = useTransactionStore((s) => s.clearAll);
  const clearCat = useCategoryStore((s) => s.clearAll);

  // ── Edit name ──────────────────────────────────────────────────────────────
  const [nameValue, setNameValue] = useState(user?.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess(false);
    setNameLoading(true);
    try {
      const updated = await profileApi.updateName(nameValue.trim());
      if (token && user) setAuth({ ...user, name: updated.name }, token);
      setNameSuccess(true);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
    } finally {
      setNameLoading(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (pwForm.new !== pwForm.confirm) {
      setPwError("Konfirmasi password tidak cocok");
      return;
    }
    if (pwForm.new.length < 8) {
      setPwError("Password baru minimal 8 karakter");
      return;
    }
    setPwLoading(true);
    try {
      await profileApi.changePassword(pwForm.old, pwForm.new);
      setPwForm({ old: "", new: "", confirm: "" });
      setPwSuccess(true);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmEmail !== user?.email) {
      setDeleteError("Email tidak sesuai");
      return;
    }
    setDeleteLoading(true);
    try {
      await profileApi.deleteAccount();
      clearTx();
      clearCat();
      logout();
      router.replace("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl space-y-8">
      {/* Avatar + info */}
      <section className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shrink-0">
          {getInitials(user.name)}
        </div>
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      {/* Edit name */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Nama Tampilan</h2>
        </div>
        <form onSubmit={handleUpdateName} className="space-y-3">
          {nameError && (
            <p className="text-sm text-destructive">{nameError}</p>
          )}
          {nameSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">Nama berhasil diperbarui</p>
          )}
          <input
            type="text"
            required
            value={nameValue}
            onChange={(e) => { setNameValue(e.target.value); setNameSuccess(false); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Nama kamu"
          />
          <button
            type="submit"
            disabled={nameLoading || nameValue.trim() === user.name}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {nameLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Nama
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Ganti Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">Password berhasil diganti</p>
          )}
          <input
            type="password"
            required
            placeholder="Password lama"
            value={pwForm.old}
            onChange={(e) => { setPwForm((f) => ({ ...f, old: e.target.value })); setPwSuccess(false); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password baru (min. 8 karakter)"
            value={pwForm.new}
            onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            required
            placeholder="Konfirmasi password baru"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Ganti Password
          </button>
        </form>
      </section>

      {/* Delete account */}
      <section className="rounded-xl border border-destructive/40 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h2 className="font-semibold text-destructive">Hapus Akun</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Akun dan semua data kamu akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Hapus Akun Saya
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <p className="text-sm text-muted-foreground">
              Ketik email kamu <strong className="break-all">{user.email}</strong> untuk konfirmasi:
            </p>
            <input
              type="email"
              required
              placeholder={user.email}
              value={deleteConfirmEmail}
              onChange={(e) => { setDeleteConfirmEmail(e.target.value); setDeleteError(""); }}
              className="w-full rounded-lg border border-destructive bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleteLoading || deleteConfirmEmail !== user.email}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-60 transition-colors"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Ya, Hapus Akun
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmEmail(""); setDeleteError(""); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
