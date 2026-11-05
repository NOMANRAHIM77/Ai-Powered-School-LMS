"use client";

import { CheckCircle2, Download, Save, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentRole } from "@/components/app-shell";
import { MarksGrid } from "@/components/marks-grid";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marksRows } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function StudentResults() {
  const subjects = [
    { name: "Mathematics", marks: 92, grade: "A+" },
    { name: "English", marks: 85, grade: "A" },
    { name: "Physics", marks: 88, grade: "A" },
    { name: "Chemistry", marks: 81, grade: "A" },
    { name: "Computer Science", marks: 91, grade: "A+" },
    { name: "Urdu", marks: 77, grade: "B" },
  ];

  return (
    <>
      <PageHeader
        title="Results"
        subtitle="Autumn Midterm · Grade 8-A · Published 18 October 2026"
        action={<Button asChild variant="outline"><Link href="/marks/report-card/STU-001"><Download />Open report card</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Overall percentage</p><p className="mt-2 font-display text-3xl font-bold">87.4%</p><Badge className="mt-3" variant="success">Grade A</Badge></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Class position</p><p className="mt-2 font-display text-3xl font-bold">3 <span className="text-base text-muted-foreground">of 32</span></p><p className="mt-3 text-xs text-success">Top 10% of class</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Teacher remark</p><p className="mt-2 text-sm font-medium leading-6">Excellent progress. Keep challenging yourself in written expression.</p></Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Subject performance</CardTitle></CardHeader>
        <CardContent><div className="space-y-4">{subjects.map((subject) => <div className="grid items-center gap-3 border-b pb-4 last:border-0 sm:grid-cols-[1fr_3fr_auto]" key={subject.name}><p className="font-semibold">{subject.name}</p><div className="h-2 rounded-full bg-muted"><div className={cn("h-2 rounded-full", subject.marks >= 80 ? "bg-success" : subject.marks >= 60 ? "bg-info" : "bg-warning")} style={{ width: `${subject.marks}%` }} /></div><div className="flex items-center gap-3"><span className="font-semibold tabular-nums">{subject.marks}/100</span><Badge variant={subject.marks >= 80 ? "success" : "info"}>{subject.grade}</Badge></div></div>)}</div></CardContent>
      </Card>
    </>
  );
}

export default function MarksPage() {
  const { role } = useCurrentRole();
  const [marks, setMarks] = useState<Record<string, number>>(Object.fromEntries(marksRows.map((row) => [row.id, row.obtained])));
  const [saveState, setSaveState] = useState("All changes saved");

  useEffect(() => {
    if (saveState !== "Unsaved changes") return;
    const timer = window.setTimeout(() => setSaveState("Draft autosaved"), 800);
    return () => window.clearTimeout(timer);
  }, [marks, saveState]);

  const values = Object.values(marks);
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  if (role === "student" || role === "parent") return <StudentResults />;

  return (
    <>
      <PageHeader title="Marks entry" subtitle="Autumn Midterm · Grade 8-A · Physics" action={<div className="flex gap-2"><Button variant="outline" onClick={() => setSaveState("Draft saved")}><Save />Save draft</Button><Button onClick={() => setSaveState("Results published")}><CheckCircle2 />Publish results</Button></div>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold">Exam<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Autumn Midterm</option><option>Monthly Test</option></select></label>
        <label className="grid gap-1 text-xs font-semibold">Class<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Grade 8-A</option></select></label>
        <label className="grid gap-1 text-xs font-semibold">Subject<select className="h-11 rounded-md border bg-background px-3 text-sm"><option>Physics</option><option>Mathematics</option></select></label>
        <div className="rounded-md border bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">Maximum marks</p><p className="font-semibold">100 · Pass 40</p></div>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3 text-xs text-muted-foreground"><span>{saveState}</span><span>Class average: <strong className="text-foreground">{average}%</strong></span></div>
        <MarksGrid rows={marksRows} values={marks} onChange={(id, value) => { setMarks((current) => ({ ...current, [id]: value })); setSaveState("Unsaved changes"); }} />
        <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-sm"><Trophy className="size-4 text-warning" /><span>Highest: <strong>{Math.max(...values)}</strong></span><span className="text-muted-foreground">·</span><span>Pass rate: <strong>{Math.round(values.filter((value) => value >= 40).length / values.length * 100)}%</strong></span></div><Button className="sm:ms-auto" onClick={() => setSaveState("All changes saved")}><Save />Save marks</Button></div>
      </Card>
    </>
  );
}
