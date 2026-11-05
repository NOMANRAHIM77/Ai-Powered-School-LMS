"use client";

import { cn } from "@/lib/utils";

export type AttendanceStatus = "present" | "absent" | "late" | "leave";
const options: { value: AttendanceStatus; label: string; className: string }[] = [
  { value: "present", label: "P", className: "data-[active=true]:border-success data-[active=true]:bg-success-soft data-[active=true]:text-success" },
  { value: "absent", label: "A", className: "data-[active=true]:border-destructive data-[active=true]:bg-danger-soft data-[active=true]:text-destructive" },
  { value: "late", label: "L", className: "data-[active=true]:border-warning data-[active=true]:bg-warning-soft data-[active=true]:text-warning" },
  { value: "leave", label: "Lv", className: "data-[active=true]:border-info data-[active=true]:bg-info-soft data-[active=true]:text-info" },
];

export function AttendanceToggle({ value, onChange, studentName }: { value: AttendanceStatus; onChange: (value: AttendanceStatus) => void; studentName: string }) {
  return <div className="inline-flex gap-1" role="radiogroup" aria-label={`Attendance for ${studentName}`}>{options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={value === option.value} data-active={value === option.value} title={option.value} className={cn("h-9 min-w-9 rounded-md border bg-background px-2 text-xs font-bold transition-colors hover:bg-muted", option.className)} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
