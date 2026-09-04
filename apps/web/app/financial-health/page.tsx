"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { financialHealthApi, type ApiFinancialHealth } from "@/lib/api";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = { savingsRate: "Savings rate", budgetAdherence: "Budget adherence", cashflowStability: "Cashflow stability", debtPressure: "Debt pressure", dataCompleteness: "Data completeness" };

export default function FinancialHealthPage() {
  const [health, setHealth] = useState<ApiFinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setHealth(await financialHealthApi.get()); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  if (loading) return <p className="text-sm text-muted-foreground">Menghitung financial health…</p>;
  if (!health?.enabled) return <div className="space-y-4"><h2 className="text-3xl font-black">Financial Health</h2><p className="text-muted-foreground">Financial health sedang dinonaktifkan.</p><Button onClick={async () => { await financialHealthApi.setEnabled(true); await load(); }}>Aktifkan</Button></div>;
  const change = health.comparison?.change;
  const ChangeIcon = change === null || change === undefined || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const comparisonText = health.comparison
    ? change === null || change === undefined
      ? `Belum dapat dibandingkan dengan ${health.comparison.period}`
      : `${change > 0 ? "+" : ""}${change} dari ${health.comparison.period}`
    : null;
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-kicker">Transparent score</p><h2 className="mt-1 text-3xl font-black">Financial Health</h2><p className="text-sm text-muted-foreground">Periode {health.period} · formula {health.formulaVersion}</p></div><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Hitung ulang</Button></div>
    <section className="rounded-3xl border bg-card p-6 text-center"><Activity className="mx-auto h-7 w-7 text-primary" />{health.score === null || health.score === undefined ? <><p className="mt-3 text-2xl font-black">Belum cukup data</p><p className="mt-1 text-sm text-muted-foreground">{health.dataQuality?.reasons.join(" ")}</p></> : <><p className="mt-2 text-6xl font-black">{health.score}</p><p className="text-sm text-muted-foreground">dari 100</p></>}{comparisonText && <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold"><ChangeIcon className="h-3.5 w-3.5" />{comparisonText}</div>}</section>
    <div className="grid gap-4 md:grid-cols-2">{Object.entries(health.components ?? {}).map(([key, component]) => <article key={key} className="rounded-2xl border bg-card p-4"><div className="flex justify-between"><h3 className="font-bold">{LABELS[key] ?? key}</h3><span className="font-black">{component.score ?? "—"}</span></div><p className="mt-2 text-sm text-muted-foreground">{component.reason}</p><p className="mt-2 text-xs">Bobot {component.weight}%</p></article>)}</div>
    {!!health.recommendations?.length && <section className="rounded-2xl border bg-card p-5"><h3 className="font-black">Langkah yang bisa dicoba</h3><ol className="mt-3 space-y-3">{health.recommendations.map((recommendation, index) => <li key={recommendation} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{index + 1}</span><span>{recommendation}</span></li>)}</ol></section>}
    <Button variant="ghost" onClick={async () => { await financialHealthApi.setEnabled(false); await load(); }}>Nonaktifkan score</Button>
  </div>;
}
