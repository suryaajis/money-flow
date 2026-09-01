"use client";

import { useEffect, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { pushApi, type PushSettings } from '@/lib/api';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function WebPushSettings() {
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { void pushApi.getSettings().then(setSettings).catch(() => setMessage('Gagal memuat Web Push.')); }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Browser tidak mendukung Web Push.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan.');
      if (!settings.publicKey) throw new Error('VAPID_PUBLIC_KEY belum dikonfigurasi di server.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (settings.enabled && !subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(settings.publicKey),
        });
      }
      if (settings.enabled && subscription) await pushApi.subscribe(subscription.toJSON());
      if (!settings.enabled && subscription) {
        await pushApi.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSettings(await pushApi.updateSettings({ enabled: settings.enabled, time: settings.time, days: settings.days }));
      setMessage('Pengaturan background reminder tersimpan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan Web Push.');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Background Web Push</CardTitle>
        <CardDescription>Reminder dikirim server walaupun Money Flow sedang tidak dibuka.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4 text-sm">
          Aktifkan background reminder
          <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
        </label>
        <Input type="time" value={settings.time} onChange={(event) => setSettings({ ...settings, time: event.target.value })} />
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, day) => (
            <button key={label} type="button" aria-pressed={settings.days.includes(day)} onClick={() => setSettings({ ...settings, days: settings.days.includes(day) ? settings.days.filter((item) => item !== day) : [...settings.days, day] })} className={`rounded-full border px-3 py-1.5 text-xs ${settings.days.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Web Push</Button>
        {message && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
