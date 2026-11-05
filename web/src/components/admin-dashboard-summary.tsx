"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, UserCog, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Strength = { total: number; active: number; disabled: number; unassigned: number; wings: { primary: number; secondary: number; higher: number } };
type Summary = { year: { name: string } | null; totals: { student: number; teacher: number; parent: number; admin: number }; students: Strength; teachers: Strength };
const wings = [{ key: "primary", label: "Primary", classes: "Classes 1–8" }, { key: "secondary", label: "Secondary", classes: "Classes 9–10" }, { key: "higher", label: "Higher", classes: "Classes 11–12" }] as const;
const number = (value?: number) => value === undefined ? "—" : value.toLocaleString();

function StrengthCard({ title, icon: Icon, strength, year }: { title: string; icon: typeof Users; strength?: Strength; year?: string }) {
  return <Card className="overflow-hidden">
    <div className="flex items-start justify-between gap-4 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-6" aria-hidden="true" /></span><div><h2 className="font-display text-xl font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{year ? `Wing strength · ${year}` : "Wing strength"}</p></div></div><div className="text-end"><p className="font-display text-3xl font-bold tabular-nums">{number(strength?.total)}</p><p className="mt-1 text-xs text-muted-foreground">Total accounts</p></div></div>
    <dl className="grid gap-3 px-5 pb-5 sm:grid-cols-3 sm:px-6 sm:pb-6">{wings.map(wing => <div key={wing.key} className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 sm:block sm:p-4"><dt className="text-xs font-semibold sm:text-sm">{wing.label}<span className="mt-1 block text-[11px] font-normal text-muted-foreground">{wing.classes}</span></dt><dd className="font-display text-3xl font-bold tabular-nums text-primary sm:mt-3">{number(strength?.wings[wing.key])}</dd></div>)}</dl>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-muted/20 px-5 py-4 text-xs text-muted-foreground sm:px-6"><span><strong className="text-foreground">{number(strength?.active)}</strong> active</span><span><strong className="text-foreground">{number(strength?.disabled)}</strong> disabled</span>{Boolean(strength?.unassigned) && <span><strong className="text-foreground">{number(strength?.unassigned)}</strong> without current-year wing assignment</span>}</div>
  </Card>;
}

export function AdminDashboardSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const reload = async () => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const { data } = await api.get("/admin/users/summary", { signal: controller.signal });
        if (!controller.signal.aborted) { setSummary(data.data); setError(""); }
      } catch (err: any) {
        if (!controller.signal.aborted) setError(err.response?.status === 403 ? "Administrator access is required." : "Unable to refresh dashboard totals. Please try again.");
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void reload();
    const timer = window.setInterval(reload, 30000);
    const onChange = () => { void reload(); };
    window.addEventListener("focus", onChange);
    window.addEventListener("academic-year-changed", onChange);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", onChange); window.removeEventListener("academic-year-changed", onChange); };
  }, [retry]);
  return <section className="mt-8 space-y-4" aria-label="School population summary" aria-busy={loading}>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"><p className="text-sm text-destructive">{error}{summary && " Showing the last loaded totals."}</p><Button size="sm" variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button></div>}
    <p className="text-sm text-muted-foreground">{loading ? "Loading school totals…" : !summary ? "Dashboard totals are unavailable." : summary.year ? "Wing strengths count active students and teachers assigned in the current academic year." : "Select a current academic year to see student and teacher wing strengths."}</p>
    <div className="grid gap-5 xl:grid-cols-2"><StrengthCard title="Students" icon={GraduationCap} strength={summary?.students} year={summary?.year?.name} /><StrengthCard title="Teachers" icon={UserCog} strength={summary?.teachers} year={summary?.year?.name} /></div>
    <div className="grid gap-4 sm:grid-cols-2">{([{ label: "Parent accounts", icon: Users, count: summary?.totals.parent }, { label: "Admin accounts", icon: ShieldCheck, count: summary?.totals.admin }]).map(({ label, icon: Icon, count }) => <Card className="flex items-center gap-4 p-5" key={label}><span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden="true" /></span><h2 className="flex-1 text-sm font-medium text-muted-foreground">{label}</h2><p className="font-display text-2xl font-bold tabular-nums">{number(count)}</p></Card>)}</div>
  </section>;
}
