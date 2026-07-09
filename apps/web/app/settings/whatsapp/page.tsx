"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Link, Unlink, CheckCircle2, AlertCircle } from "lucide-react";

interface WaStatus {
  linked: boolean;
  phone: string | null;
  linkedAt: string | null;
}

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/users/whatsapp`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/users/whatsapp/link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone }),
        },
      );
      if (res.ok) {
        setMessage({ type: "success", text: "WhatsApp berhasil dihubungkan! Kirim pesan ke bot untuk memulai." });
        setPhone("");
        await fetchStatus();
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: body.message ?? "Gagal menghubungkan WhatsApp." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan. Coba lagi." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlink() {
    if (!confirm("Putuskan koneksi WhatsApp?")) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/users/whatsapp/link`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok || res.status === 204) {
        setMessage({ type: "success", text: "WhatsApp berhasil diputuskan." });
        await fetchStatus();
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">WhatsApp Bot</h1>
          <p className="text-sm text-muted-foreground">Catat transaksi langsung dari WhatsApp</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border p-6 text-center text-muted-foreground text-sm">
          Memuat status...
        </div>
      ) : status?.linked ? (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">WhatsApp Terhubung</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Nomor: <span className="font-mono text-foreground">+{status.phone}</span></p>
            {status.linkedAt && (
              <p className="mt-1">
                Dihubungkan:{" "}
                {new Date(status.linkedAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Cara penggunaan:</p>
            <p className="text-muted-foreground">• Ketik <code className="bg-muted px-1 rounded">kopi 15rb</code> untuk catat pengeluaran</p>
            <p className="text-muted-foreground">• Ketik <code className="bg-muted px-1 rounded">gajian 5jt</code> untuk catat pemasukan</p>
            <p className="text-muted-foreground">• Ketik <code className="bg-muted px-1 rounded">saldo</code> untuk cek saldo bulan ini</p>
            <p className="text-muted-foreground">• Ketik <code className="bg-muted px-1 rounded">bantuan</code> untuk semua perintah</p>
          </div>

          <button
            onClick={handleUnlink}
            disabled={submitting}
            className="flex items-center gap-2 text-sm text-destructive hover:underline disabled:opacity-50"
          >
            <Unlink className="h-4 w-4" />
            Putuskan koneksi WhatsApp
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungkan nomor WhatsApp-mu untuk mulai mencatat transaksi langsung dari chat.
          </p>
          <form onSubmit={handleLink} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nomor WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">Format: 08xxx atau 628xxx</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Link className="h-4 w-4" />
              {submitting ? "Menghubungkan..." : "Hubungkan WhatsApp"}
            </button>
          </form>
        </div>
      )}

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
    </div>
  );
}
