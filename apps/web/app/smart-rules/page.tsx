"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { categoriesApi, smartRulesApi, type ApiCategory, type ApiSmartRule } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function SmartRulesPage() {
  const [rules, setRules] = useState<ApiSmartRule[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ merchant: string; occurrences: number; conditions: ApiSmartRule["conditions"]; actions: ApiSmartRule["actions"] }>>([]);
  const [message, setMessage] = useState("");
  const [undoBatch, setUndoBatch] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", descriptionContains: "", categoryId: "", priority: "100" });
  const load = async () => {
    const [ruleRows, suggestionRows, categoryRows] = await Promise.all([smartRulesApi.getAll(), smartRulesApi.suggestions(), categoriesApi.getAll()]);
    setRules(ruleRows); setSuggestions(suggestionRows); setCategories(categoryRows);
  };
  useEffect(() => { void load(); }, []);
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-widest text-kicker">Automation</p><h2 className="mt-1 text-3xl font-black">Smart Rules</h2><p className="text-sm text-muted-foreground">Preview dulu, lalu terapkan perubahan yang tetap bisa di-undo selama tujuh hari.</p></div>
    {!!suggestions.length && <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><h3 className="font-black">Saran dari koreksi berulang</h3><p className="mt-1 text-sm text-muted-foreground">Saran tidak aktif otomatis. Tinjau lalu setujui satu per satu.</p><div className="mt-3 space-y-2">{suggestions.map((suggestion) => <div key={`${suggestion.merchant}-${suggestion.actions.categoryId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3"><p className="text-sm"><span className="font-bold">{suggestion.merchant}</span> dikoreksi {suggestion.occurrences} kali</p><Button size="sm" onClick={async () => { await smartRulesApi.create({ name: `Kategori otomatis: ${suggestion.merchant}`, conditions: suggestion.conditions, actions: suggestion.actions, priority: 100, active: true, stopOnMatch: true }); await load(); }}>Setujui rule</Button></div>)}</div></section>}
    <section className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-4"><Input placeholder="Nama rule" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Input placeholder="Catatan mengandung…" value={form.descriptionContains} onChange={(event) => setForm({ ...form, descriptionContains: event.target.value })} /><Select value={form.categoryId} onValueChange={(categoryId) => setForm({ ...form, categoryId })} placeholder="Set kategori" options={categories.map((category) => ({ value: category.id, label: category.name }))} /><Button disabled={!form.name || !form.descriptionContains || !form.categoryId} onClick={async () => { await smartRulesApi.create({ name: form.name, conditions: { descriptionContains: form.descriptionContains }, actions: { categoryId: form.categoryId }, priority: Number(form.priority), active: true, stopOnMatch: true }); setForm({ name: "", descriptionContains: "", categoryId: "", priority: "100" }); await load(); }}><Sparkles className="h-4 w-4" /> Buat rule</Button></section>
    {message && <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm"><span>{message}</span>{undoBatch && <Button size="sm" variant="outline" onClick={async () => { const result = await smartRulesApi.undo(undoBatch); setMessage(`${result.restored} transaksi dikembalikan.`); setUndoBatch(null); }}><RotateCcw className="h-4 w-4" /> Undo</Button>}</div>}
    <div className="space-y-3">{rules.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">Belum ada smart rule.</p> : rules.map((rule) => <article key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"><div><p className="font-bold">{rule.name}</p><p className="text-xs text-muted-foreground">Jika catatan mengandung “{rule.conditions.descriptionContains}” · priority {rule.priority} · {rule.active ? "aktif" : "nonaktif"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={async () => { const result = await smartRulesApi.preview(rule.id); setMessage(`${result.count} transaksi cocok. Preview tidak mengubah data.`); setUndoBatch(null); }}>Preview</Button><Button size="sm" onClick={async () => { const result = await smartRulesApi.apply(rule.id); setMessage(`${result.affected} transaksi diperbarui.`); setUndoBatch(result.batchId); }}><Play className="h-4 w-4" /> Terapkan</Button><Button size="sm" variant="ghost" onClick={async () => { await smartRulesApi.delete(rule.id); await load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></article>)}</div>
  </div>;
}
