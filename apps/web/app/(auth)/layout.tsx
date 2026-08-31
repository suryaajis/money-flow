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
  { icon: BarChart3, label: "Analitik jernih" },
  { icon: MessageCircleMore, label: "Catat lewat WA" },
  { icon: ShieldCheck, label: "Data tetap aman" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-3 sm:p-6">
      <div className="mf-card grid min-w-0 w-full max-w-[calc(100vw-1.5rem)] grid-cols-1 overflow-hidden rounded-[1.75rem] border border-border bg-card/88 shadow-[0_28px_90px_rgba(30,41,90,.16)] backdrop-blur-xl sm:max-w-6xl lg:min-h-[680px] lg:grid-cols-[1.05fr_.95fr]">
        <aside className="hero-vault relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="hero-vault-content">
            <div className="flex items-center gap-3">
              <FlowBuddy />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                  MoneyFlow
                </p>
                <p className="text-sm text-white/80">
                  Teman uang yang nggak menghakimi
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-md">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Lebih rapi,
                lebih lega
              </p>
              <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.055em]">
                Uangmu punya cerita. Yuk, baca dengan tenang.
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-indigo-100/85">
                Catat yang masuk, pahami yang keluar, lalu rayakan kemajuan
                kecilmu.
              </p>
            </div>
          </div>

          <div className="hero-vault-content grid grid-cols-3 gap-3">
            {highlights.map(({ icon: ItemIcon, label }) => {
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-white/12 bg-white/[0.08] p-3 backdrop-blur"
                >
                  <ItemIcon className="mb-2 h-4 w-4 text-amber-200" />
                  <p className="text-xs font-medium text-white/85">{label}</p>
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
