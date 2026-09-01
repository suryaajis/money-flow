"use client";

import { useEffect, useState } from "react";
import { BarChart3, PiggyBank, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { v14EnhancementsEnabled } from "@/lib/featureFlags";

const steps = [
  { title: "Catat", body: "Tambahkan pemasukan dan pengeluaran dari web atau WhatsApp.", icon: ReceiptText },
  { title: "Pahami", body: "Lihat tren dan kategori terbesar lewat dashboard serta analytics.", icon: BarChart3 },
  { title: "Rencanakan", body: "Atur budget dan reminder agar keputusan berikutnya lebih tenang.", icon: PiggyBank },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    if (v14EnhancementsEnabled && !localStorage.getItem("moneyflow:onboarding-v1")) setStep(0);
  }, []);
  if (step === null) return null;
  const current = steps[step];
  const Icon = current.icon;
  const close = () => {
    localStorage.setItem("moneyflow:onboarding-v1", "done");
    setStep(null);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
        <button autoFocus onClick={close} aria-label="Tutup onboarding" className="float-right rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime text-brand-navy"><Icon /></div>
        <p className="text-xs font-bold uppercase tracking-widest text-kicker">Langkah {step + 1} dari 3</p>
        <h2 id="onboarding-title" className="mt-2 text-2xl font-black">{current.title}</h2>
        <p className="mt-2 text-muted-foreground">{current.body}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={close}>Lewati</Button>
          <Button onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? "Mulai" : "Lanjut"}</Button>
        </div>
      </section>
    </div>
  );
}
