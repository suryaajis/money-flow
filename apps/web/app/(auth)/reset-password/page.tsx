"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("Token tidak ditemukan. Gunakan link dari email kamu.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-sm text-muted-foreground">Buat password baru untuk akunmu</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-sm text-muted-foreground">
            Password berhasil direset! Kamu akan diarahkan ke halaman login...
          </p>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Login sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Password Baru</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Konfirmasi Password</label>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ulangi password baru"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Password Baru
          </button>
        </form>
      )}
    </div>
  );
}
