"use client";

import { ChevronDown } from "lucide-react";

import { AvatarWithFallback } from "@/components/avatar-with-fallback";

export type ChildOption = { id: string; name: string; className: string; initials: string };

export function ChildSwitcher({ children, value, onChange }: { children: ChildOption[]; value: string; onChange: (id: string) => void }) {
  const selected = children.find((child) => child.id === value) ?? children[0];
  if (!selected) return null;
  return <label className="relative flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 pe-10 shadow-sm"><AvatarWithFallback className="size-8" initials={selected.initials} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{selected.name}</span><span className="block text-xs text-muted-foreground">{selected.className}</span></span><select className="absolute inset-0 cursor-pointer opacity-0" aria-label="Select child" value={selected.id} onChange={(event) => onChange(event.target.value)}>{children.map((child) => <option key={child.id} value={child.id}>{child.name} · {child.className}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 size-4 text-muted-foreground" /></label>;
}
