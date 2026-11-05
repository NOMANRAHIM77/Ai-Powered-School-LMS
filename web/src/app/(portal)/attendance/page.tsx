"use client";
import { ParentWorkspace } from "@/components/parent-workspace";

import { CalendarDays, Check, CheckCircle2, Clock3, RotateCcw, Save, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CourseWorkspace } from "@/components/course-workspace";
import { useCurrentRole } from "@/components/app-shell";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { attendanceStudents } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "leave";
const statusOptions: { value: AttendanceStatus; label: string; short: string; icon: typeof Check; className: string }[] = [
  { value: "present", label: "Present", short: "P", icon: Check, className: "data-[active=true]:border-success data-[active=true]:bg-success-soft data-[active=true]:text-success" },
  { value: "absent", label: "Absent", short: "A", icon: X, className: "data-[active=true]:border-destructive data-[active=true]:bg-danger-soft data-[active=true]:text-destructive" },
  { value: "late", label: "Late", short: "L", icon: Clock3, className: "data-[active=true]:border-warning data-[active=true]:bg-warning-soft data-[active=true]:text-warning" },
  { value: "leave", label: "Leave", short: "Lv", icon: CalendarDays, className: "data-[active=true]:border-info data-[active=true]:bg-info-soft data-[active=true]:text-info" },
];

function AttendanceReport() {
  const months = [{ month: "October", present: 18, absent: 1, late: 1, rate: 95 }, { month: "September", present: 21, absent: 1, late: 0, rate: 95 }, { month: "August", present: 20, absent: 0, late: 1, rate: 100 }, { month: "July", present: 17, absent: 2, late: 1, rate: 89 }];
  return <><PageHeader title="Attendance" subtitle="Your attendance history for academic year 2026–27." /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-sm text-muted-foreground">Overall attendance</p><p className="mt-2 font-display text-3xl font-bold">94.2%</p><Badge className="mt-3" variant="success">Above requirement</Badge></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Days present</p><p className="mt-2 font-display text-3xl font-bold">76</p><p className="mt-3 text-xs text-muted-foreground">of 81 working days</p></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Absence balance</p><p className="mt-2 font-display text-3xl font-bold">5</p><p className="mt-3 text-xs text-muted-foreground">3 excused · 2 unexcused</p></Card></div><Card className="mt-6"><CardHeader><CardTitle>Monthly summary</CardTitle></CardHeader><CardContent><div className="space-y-4">{months.map((item) => <div className="grid items-center gap-3 border-b pb-4 last:border-0 sm:grid-cols-[1fr_auto_auto_auto_2fr]" key={item.month}><p className="font-semibold">{item.month}</p><span className="text-sm text-success">{item.present} P</span><span className="text-sm text-destructive">{item.absent} A</span><span className="text-sm text-warning">{item.late} L</span><div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-success" style={{ width: `${item.rate}%` }} /></div><span className="w-10 text-end text-sm font-semibold">{item.rate}%</span></div></div>)}</div></CardContent></Card></>;
}

export default function AttendancePage() {
  const { role } = useCurrentRole();
  const initial = Object.fromEntries(attendanceStudents.map((student) => [student.id, student.status])) as Record<string, AttendanceStatus>;
  const [records, setRecords] = useState(initial); const [previous, setPrevious] = useState(initial); const [query, setQuery] = useState(""); const [saved, setSaved] = useState(false);
  const filtered = attendanceStudents.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()));
  const counts = useMemo(() => statusOptions.map((option) => ({ ...option, count: Object.values(records).filter((value) => value === option.value).length })), [records]);
  if (role === "parent") return <ParentWorkspace />; if (role === "teacher") return <CourseWorkspace role="teacher" />;
  if (role === "student") return <AttendanceReport />;
  const save = () => { setPrevious(records); setSaved(true); window.setTimeout(() => setSaved(false), 5000); };
  return <><PageHeader title="Mark attendance" subtitle="Grade 8-A · Thursday, 23 October 2026" action={<Button onClick={() => setRecords(Object.fromEntries(attendanceStudents.map((student) => [student.id, "present"])) as Record<string, AttendanceStatus>)} variant="outline"><CheckCircle2 />Mark all present</Button>} /><Card><div className="grid gap-3 border-b p-4 md:grid-cols-4"><label className="grid gap-1.5 text-xs font-semibold">Class<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Grade 8</option><option>Grade 9</option></select></label><label className="grid gap-1.5 text-xs font-semibold">Section<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Section A</option><option>Section B</option></select></label><label className="grid gap-1.5 text-xs font-semibold">Date<Input defaultValue="2026-10-23" type="date" /></label><label className="grid gap-1.5 text-xs font-semibold">Find student<span className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-10" placeholder="Search…" value={query} onChange={(event) => setQuery(event.target.value)} /></span></label></div>
    <div className="divide-y">{filtered.map((student) => <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center" key={student.id}><div className="flex min-w-0 items-center gap-3 sm:w-72"><AvatarWithFallback initials={student.initials} /><div><p className="font-semibold">{student.name}</p><p className="text-xs text-muted-foreground">Roll {student.roll} · {student.attendance}% overall</p></div></div><div className="grid flex-1 grid-cols-4 gap-2" role="group" aria-label={`Attendance for ${student.name}`}>{statusOptions.map((option) => { const Icon = option.icon; const active = records[student.id] === option.value; return <button className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition", option.className)} data-active={active} key={option.value} onClick={() => setRecords((current) => ({ ...current, [student.id]: option.value }))} title={`${option.label} (${option.short})`} type="button"><Icon className="size-4" /><span className="hidden md:inline">{option.label}</span><span className="md:hidden">{option.short}</span></button>; })}</div></div>)}</div></Card>
    <div className="sticky bottom-4 z-10 mt-5 flex flex-col gap-4 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center"><div className="flex flex-wrap gap-2">{counts.map((item) => <StatusBadge key={item.value} value={item.value} compact />)}<span className="self-center text-xs text-muted-foreground">{counts.map((item) => `${item.short} ${item.count}`).join(" · ")}</span></div><div className="ms-auto flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:block">Keyboard: P · A · L · V</span><Button onClick={save}><Save />Save attendance</Button></div></div>
    {saved && <div className="fixed bottom-6 end-6 z-50 flex items-center gap-3 rounded-lg bg-foreground p-4 text-sm text-background shadow-xl"><CheckCircle2 className="size-5 text-success" /><span>Attendance saved for 6 students.</span><button className="ms-3 flex items-center gap-1 font-semibold text-primary" onClick={() => { setRecords(previous); setSaved(false); }}><RotateCcw className="size-4" />Undo</button></div>}
  </>;
}


