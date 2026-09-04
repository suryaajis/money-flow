"use client";

import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { syncOfflineTransactions } from '@/lib/api';
import { listMutations } from '@/lib/offlineTransactions';
import { useTransactionStore } from '@/store/transactionStore';

export const DataBootstrap: React.FC = () => {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const refresh = async () => setPending((await listMutations()).length);
    const sync = async () => {
      if (disposed) return;
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setSyncFailed(false);
        try {
          await syncOfflineTransactions();
          const loaded = await fetchTransactions();
          if (!loaded) {
            setSyncFailed(true);
            retryTimer = setTimeout(() => void sync(), 5_000);
          }
        } catch {
          setSyncFailed(true);
          retryTimer = setTimeout(() => void sync(), 5_000);
        }
      }
      await refresh();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', sync);
    window.addEventListener('offline', onOffline);
    window.addEventListener('moneyflow:offline-synced', refresh);
    window.addEventListener('moneyflow:offline-queue-changed', refresh);
    void sync();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('moneyflow:offline-synced', refresh);
      window.removeEventListener('moneyflow:offline-queue-changed', refresh);
    };
  }, [fetchTransactions]);

  if (online && pending === 0 && !syncFailed) return null;
  return (
    <div role="status" className="fixed bottom-24 left-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold shadow-lg md:bottom-5">
      {online ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}
      {syncFailed
        ? `${pending} perubahan gagal disinkronkan dan tetap tersimpan`
        : online
          ? `Menyinkronkan ${pending} perubahan`
          : `${pending} perubahan menunggu koneksi`}
    </div>
  );
};
