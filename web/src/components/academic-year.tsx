"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Year = { _id: string; name: string; startDate: string; endDate: string; isCurrent: boolean };

export function AcademicYearBadge() {
  const [year, setYear] = useState<string | null>(null);
  const refresh = useCallback(async () => { if (!localStorage.getItem("educore-access-token")) return; try { const { data } = await api.get("/academic/current-year"); setYear(data.data?.name ?? "Not selected"); } catch { setYear("Unavailable"); } }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 30000); const reload = () => void refresh(); window.addEventListener("focus", reload); window.addEventListener("academic-year-changed", reload); return () => { window.clearInterval(timer); window.removeEventListener("focus", reload); window.removeEventListener("academic-year-changed", reload); }; }, [refresh]);
  return <span className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground" aria-label={`Current academic year: ${year ?? "loading"}`}><span className="hidden sm:inline">Academic year: </span>{year ?? "…"}</span>;
}

export function AcademicYearManager({ onChanged }: { onChanged: () => void }) {
  const [years, setYears] = useState<Year[]>([]); const [selected, setSelected] = useState("");
  const [name, setName] = useState(""); const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const refresh = useCallback(async () => { const { data } = await api.get("/admin/users/academic-years"); setYears(data.data); setSelected(data.data.find((year: Year) => year.isCurrent)?._id ?? ""); }, []);
  useEffect(() => { void refresh().catch(() => setError("Unable to load academic years.")); }, [refresh]);
  async function choose() { if (!selected) return; setBusy(true); setError(""); setMessage(""); try { await api.patch(`/admin/users/academic-years/${selected}/current`); await refresh(); onChanged(); window.dispatchEvent(new Event("academic-year-changed")); setMessage("Current academic year updated and standard sections are ready."); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to select academic year."); } finally { setBusy(false); } }
  async function create(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const { data } = await api.post("/admin/users/academic-years", { name, startDate, endDate }); const id = data.data._id; await api.patch(`/admin/users/academic-years/${id}/current`); await refresh(); onChanged(); window.dispatchEvent(new Event("academic-year-changed")); setName(""); setStartDate(""); setEndDate(""); setMessage("Academic year created and selected."); } catch (err: any) { setError(err.response?.data?.message ?? "Unable to create academic year."); } finally { setBusy(false); } }
  return <div className="mt-7 grid gap-6 lg:grid-cols-2"><Card className="p-6"><h2 className="font-display text-lg font-bold">Current academic year</h2><p className="mt-2 text-sm text-muted-foreground">The selected year is displayed in the student and teacher portals.</p><label className="mt-5 grid gap-2 text-sm font-semibold">Academic year<select className="h-11 rounded-md border bg-background px-3" value={selected} onChange={event => setSelected(event.target.value)}><option value="">Select an academic year</option>{years.map(year => <option key={year._id} value={year._id}>{year.name}{year.isCurrent ? " · Current" : ""}</option>)}</select></label><Button className="mt-4" disabled={!selected || busy} onClick={() => void choose()}>{busy ? "Saving…" : "Set as current"}</Button></Card><Card className="p-6"><h2 className="font-display text-lg font-bold">Add academic year</h2><form className="mt-5 grid gap-4" onSubmit={create}><label className="grid gap-2 text-sm font-semibold">Name<Input required maxLength={80} placeholder="e.g. 2026–27" value={name} onChange={event => setName(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Start date<Input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">End date<Input required type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label><Button disabled={busy} type="submit">Create and set as current</Button></form></Card>{error && <p role="alert" className="text-sm text-destructive lg:col-span-2">{error}</p>}{message && <p role="status" className="text-sm text-success lg:col-span-2">{message}</p>}</div>;
}
