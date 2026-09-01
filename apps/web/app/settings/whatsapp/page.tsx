"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Link,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Bell,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

interface WaStatus {
  linked: boolean;
  phone: string | null;
  linkedAt: string | null;
}

interface NotificationPrefs {
  notifyMonthlyRecap: boolean;
  notifyOverBudget: boolean;
  notifyDebtDue: boolean;
}

interface LinkChallenge {
  linkUrl: string;
  businessPhone: string;
  expiresAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const PREF_LABELS: {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
}[] = [
  {
    key: "notifyMonthlyRecap",
    label: "Rekap awal bulan",
    desc: "Ringkasan bulan lalu setiap tanggal 1",
  },
  {
    key: "notifyOverBudget",
    label: "Alert budget terlampaui",
    desc: "Peringatan saat pengeluaran melebihi budget",
  },
  {
    key: "notifyDebtDue",
    label: "Pengingat jatuh tempo utang",
    desc: "Ingatkan H-1 dan hari-H utang piutang",
  },
];

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkChallenge, setLinkChallenge] = useState<LinkChallenge | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchPrefs();
  }, []);

  async function fetchPrefs() {
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(`${API_BASE}/users/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPrefs(await res.json());
    } catch {
      // ignore
    }
  }

  async function togglePref(key: keyof NotificationPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(`${API_BASE}/users/notifications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (res.ok) setPrefs(await res.json());
    } catch {
      setPrefs(prefs); // revert
    }
  }

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

  async function handleLink() {
    setSubmitting(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("mf:token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/users/whatsapp/link`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const body = await res.json();
        setLinkChallenge(body);
        setMessage({
          type: "success",
          text: "Link siap. Buka WhatsApp lalu kirim pesan yang sudah disiapkan.",
        });
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: body.message ?? "Gagal menghubungkan WhatsApp.",
        });
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
    <div className="mx-auto max-w-2xl space-y-6 py-2 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-green-600/10 text-emerald-600 shadow-sm dark:text-emerald-400">
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-emerald-400" />
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" /> Chat jadi catatan
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            WhatsApp Bot
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat transaksi sambil ngobrol—Flow yang urus sisanya.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mf-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          Memuat status...
        </div>
      ) : status?.linked ? (
        <div className="mf-card overflow-hidden rounded-2xl border border-emerald-500/20 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">WhatsApp Terhubung</span>
            </div>
            <FlowBuddy size="sm" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              Nomor:{" "}
              <span className="font-mono text-foreground">+{status.phone}</span>
            </p>
            {status.linkedAt && (
              <p className="mt-1">
                Dihubungkan:{" "}
                {new Date(status.linkedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/45 p-4 text-sm space-y-1.5">
            <p className="font-medium text-foreground">Cara penggunaan:</p>
            <p className="text-muted-foreground">
              • Ketik <code className="bg-muted px-1 rounded">kopi 15rb</code>{" "}
              untuk catat pengeluaran
            </p>
            <p className="text-muted-foreground">
              • Ketik <code className="bg-muted px-1 rounded">gajian 5jt</code>{" "}
              untuk catat pemasukan
            </p>
            <p className="text-muted-foreground">
              • Ketik <code className="bg-muted px-1 rounded">saldo</code> untuk
              cek saldo bulan ini
            </p>
            <p className="text-muted-foreground">
              • Ketik <code className="bg-muted px-1 rounded">bantuan</code>{" "}
              untuk semua perintah
            </p>
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
        <div className="mf-card overflow-hidden rounded-2xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungkan nomor WhatsApp-mu untuk mulai mencatat transaksi langsung
            dari chat.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLink}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-50"
            >
              <Link className="h-4 w-4" />
              {submitting ? "Membuat link..." : "Buat Link WhatsApp"}
            </button>
            {linkChallenge && (
              <div className="page-enter space-y-3 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
                <p className="text-xs text-muted-foreground">
                  Link berlaku sampai{" "}
                  {new Date(linkChallenge.expiresAt).toLocaleTimeString(
                    "id-ID",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                  . Kirim pesan tersebut dari nomor WhatsApp yang ingin
                  dihubungkan.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={linkChallenge.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-transform hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => fetchStatus()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Cek Status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status?.linked && prefs && (
        <div className="mf-card rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Notifikasi WhatsApp</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Semua notifikasi opt-in (default mati), maksimal 1 pesan proaktif
            per hari.
          </p>
          <div className="space-y-3">
            {PREF_LABELS.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => togglePref(key)}
                  className={`focus-ring relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                    prefs[key] ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      prefs[key] ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div
          className={`page-enter flex items-start gap-2 rounded-xl border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/20 bg-destructive/10 text-destructive"
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
