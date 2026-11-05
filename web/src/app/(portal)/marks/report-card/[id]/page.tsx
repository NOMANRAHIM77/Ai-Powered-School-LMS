import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { PrintLayout } from "@/components/print-layout";
import { Button } from "@/components/ui/button";

const results = [
  ["Mathematics", 100, 92, "A+"],
  ["English", 100, 85, "A"],
  ["Physics", 100, 88, "A"],
  ["Chemistry", 100, 81, "A"],
  ["Computer Science", 100, 91, "A+"],
  ["Urdu", 100, 77, "B"],
];

export default function ReportCardPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost"><Link href="/marks"><ArrowLeft />Back to results</Link></Button>
        <div className="flex gap-2"><PrintButton label="Save as PDF" variant="outline" /><PrintButton label="Print report card" /></div>
      </div>
      <PrintLayout>
        <header className="border-b-2 border-indigo-600 pb-6 text-center">
          <p className="font-display text-3xl font-bold text-indigo-700">Bright Future Academy</p>
          <p className="mt-1 text-sm text-slate-600">Autumn Midterm Examination · Academic Year 2026–27</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Student report card</p>
        </header>
        <section className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4 rounded-lg bg-slate-50 p-5 text-sm">
          <div><p className="text-xs text-slate-500">Student</p><p className="font-semibold">Ayesha Khan</p></div>
          <div><p className="text-xs text-slate-500">Admission / roll no.</p><p className="font-semibold">ADM-2024-001 · 08-A-01</p></div>
          <div><p className="text-xs text-slate-500">Class</p><p className="font-semibold">Grade 8-A</p></div>
          <div><p className="text-xs text-slate-500">Published</p><p className="font-semibold">18 October 2026</p></div>
        </section>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-y bg-slate-50"><th className="px-3 py-3 text-start">Subject</th><th className="px-3 py-3 text-end">Maximum</th><th className="px-3 py-3 text-end">Obtained</th><th className="px-3 py-3 text-end">Grade</th></tr></thead>
          <tbody>{results.map(([subject, max, obtained, grade]) => <tr className="border-b" key={subject}><td className="px-3 py-3 font-medium">{subject}</td><td className="px-3 py-3 text-end">{max}</td><td className="px-3 py-3 text-end font-semibold">{obtained}</td><td className="px-3 py-3 text-end font-bold">{grade}</td></tr>)}</tbody>
        </table>
        <section className="mt-7 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Percentage</p><p className="mt-1 font-display text-2xl font-bold">87.4%</p></div>
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Overall grade</p><p className="mt-1 font-display text-2xl font-bold text-green-700">A</p></div>
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Class position</p><p className="mt-1 font-display text-2xl font-bold">3 / 32</p></div>
        </section>
        <div className="mt-8 rounded-lg border p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Class teacher’s remarks</p><p className="mt-2 text-sm leading-6">Excellent progress. Ayesha demonstrates strong analytical skills and consistent effort. Keep challenging yourself in written expression.</p></div>
        <div className="mt-16 grid grid-cols-3 gap-10 text-center text-xs text-slate-500"><div className="border-t pt-2">Class teacher</div><div className="border-t pt-2">Examination head</div><div className="border-t pt-2">Principal</div></div>
      </PrintLayout>
    </>
  );
}
