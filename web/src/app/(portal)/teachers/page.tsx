"use client";

import { Download, Mail, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { teachers } from "@/lib/mock-data";

export default function TeachersPage() {
  const [query, setQuery] = useState(""); const filtered = useMemo(() => teachers.filter((teacher) => (teacher.name + teacher.subject).toLowerCase().includes(query.toLowerCase())), [query]);
  return <><PageHeader title="Teachers" subtitle="Manage staff profiles, subject assignments, and class responsibilities." action={<Button><Plus />Add teacher</Button>} /><Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-10" placeholder="Search teachers or subjects…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Button variant="outline"><Download />Export</Button></div><div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">{filtered.map((teacher) => <div className="flex items-center gap-4 p-5" key={teacher.id}><AvatarWithFallback className="size-12" initials={teacher.initials} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold">{teacher.name}</p><StatusBadge value="active" /></div><p className="mt-1 text-sm text-primary">{teacher.subject}</p><p className="mt-1 text-xs text-muted-foreground">{teacher.id} · Classes {teacher.classes}</p><div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><Mail className="size-3.5" />{teacher.name.toLowerCase().replaceAll(" ", ".")}@educore.edu.pk</div></div><Button size="icon" variant="ghost"><MoreHorizontal /><span className="sr-only">Actions</span></Button></div>)}</div></Card></>;
}
