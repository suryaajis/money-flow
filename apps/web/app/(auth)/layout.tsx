import type { Metadata } from "next";
import {
  BarChart3,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FlowBuddy } from "@/components/shared/FlowBuddy";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s · Money Flow" template, which
  // would otherwise render "Money Flow · Money Flow" on the auth pages.
  // These pages are client components, so the title must live on this layout.
  title: { absolute: "Money Flow" },
};

const highlights = [
  { icon: BarChart3, label: "Analitik jernih", tone: "bg-brand-lime" },
  { icon: MessageCircleMore, label: "Catat lewat WA", tone: "bg-white" },
  { icon: ShieldCheck, label: "Data tetap aman", tone: "bg-accent" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-3 sm:p-6">
      <div className="mf-card grid min-w-0 w-full max-w-[calc(100vw-1.5rem)] grid-cols-1 overflow-hidden rounded-[2.25rem] border border-brand-navy/15 bg-card/88 shadow-[0_12px_0_rgba(0,0,0,.08),0_32px_90px_rgba(0,0,0,.16)] backdrop-blur-xl sm:max-w-6xl lg:min-h-[680px] lg:grid-cols-[1.05fr_.95fr]">
        <aside className="hero-vault relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="hero-vault-content">
            <div className="flex items-center gap-3">
              <FlowBuddy />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-lime">
                  MoneyFlow
                </p>
                <p className="text-sm text-white/80">
                  Teman uang yang nggak menghakimi
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-md">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-brand-lime" /> Lebih rapi,
                lebih lega
              </p>
              <h1 className="text-5xl font-black leading-[.98] tracking-[-0.075em]">
                Uangmu punya cerita. Yuk, baca dengan tenang.
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
                Catat yang masuk, pahami yang keluar, lalu rayakan kemajuan
                kecilmu.
              </p>
            </div>
          </div>

          <div className="hero-vault-content grid grid-cols-3 gap-3">
            {highlights.map(({ icon: ItemIcon, label, tone }) => {
              return (
                <div
                  key={label}
                  className={`neo-sticker rounded-[1.2rem] p-3 text-brand-navy transition-transform hover:-translate-y-1 hover:-rotate-1 ${tone}`}
                >
                  <ItemIcon className="mb-2 h-4 w-4" />
                  <p className="text-xs font-bold">{label}</p>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="relative flex min-w-0 items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="absolute right-7 top-7 hidden h-20 w-20 rounded-full bg-primary/10 blur-2xl sm:block" />
          {children}
        </main>
      </div>
    </div>
  );
}
