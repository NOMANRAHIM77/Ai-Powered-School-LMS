"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MarksGridRow = { id: string; roll: string; name: string; obtained: number };
const grade = (value: number) => value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B" : value >= 60 ? "C" : value >= 50 ? "D" : "F";

export function MarksGrid({ rows, values, maximum = 100, onChange }: { rows: MarksGridRow[]; values: Record<string, number>; maximum?: number; onChange: (id: string, value: number) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/70 text-xs"><tr><th className="px-4 py-3 text-start">Roll no.</th><th className="px-4 py-3 text-start">Student</th><th className="px-4 py-3 text-start">Marks</th><th className="px-4 py-3 text-start">Percentage</th><th className="px-4 py-3 text-start">Grade</th></tr></thead><tbody>{rows.map((row) => { const value = values[row.id] ?? row.obtained; const percentage = Math.round(value / maximum * 100); return <tr key={row.id} className={cn("border-t", percentage < 40 && "bg-danger-soft/60")}><td className="px-4 py-3 font-mono text-xs">{row.roll}</td><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3"><input className="h-10 w-24 rounded-md border bg-background px-3 font-semibold outline-none focus:ring-2 focus:ring-ring" aria-label={`Marks for ${row.name}`} type="number" min={0} max={maximum} value={value} onChange={(event) => onChange(row.id, Math.max(0, Math.min(maximum, Number(event.target.value))))} /></td><td className="px-4 py-3 font-semibold tabular-nums">{percentage}%</td><td className="px-4 py-3"><Badge variant={percentage < 40 ? "destructive" : percentage >= 80 ? "success" : "info"}>{grade(percentage)}</Badge></td></tr>; })}</tbody></table></div>;
}
