"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { waNotificationsApi, type WaNotificationSettings } from "@/lib/api";
import { Label } from "@/components/ui/label";

export function WhatsAppDailyReminder() {
  const [settings, setSettings] = useState<WaNotificationSettings | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { waNotificationsApi.get().then(setSettings).catch(() => setMessage("Gagal memuat pengaturan WhatsApp.")); }, []);
  const update = async (patch: Partial<WaNotificationSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    try {
      setSettings(await waNotificationsApi.update(patch));
      setMessage("Pengaturan WhatsApp tersimpan.");
    } catch { setMessage("Gagal menyimpan pengaturan WhatsApp."); }
  };
  if (!settings) return message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null;
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div><Label className="flex items-center gap-2 text-base font-semibold"><MessageCircle className="h-4 w-4" />Reminder WhatsApp</Label><p className="text-sm text-muted-foreground">Dikirim hanya bila belum ada transaksi hari ini.</p></div>
        <button type="button" role="switch" aria-checked={settings.notifyDailyInput} onClick={() => update({ notifyDailyInput: !settings.notifyDailyInput })} className={`relative h-6 w-11 rounded-full ${settings.notifyDailyInput ? "bg-primary" : "bg-input"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.notifyDailyInput ? "translate-x-6" : "translate-x-1"}`} /></button>
      </div>
      <input aria-label="Waktu reminder WhatsApp" type="time" disabled={!settings.notifyDailyInput} value={settings.dailyInputTime} onChange={(event) => update({ dailyInputTime: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2 disabled:opacity-40" />
      {message && <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}
