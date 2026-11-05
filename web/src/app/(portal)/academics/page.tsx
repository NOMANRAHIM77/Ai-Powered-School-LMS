import { BookOpen, CalendarRange, GraduationCap, Plus, School, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const classRows = [
  { name: "Grade 6", sections: 3, students: 126, subjects: 10, teacher: "Mariam Iqbal" },
  { name: "Grade 7", sections: 3, students: 132, subjects: 10, teacher: "Hassan Ali" },
  { name: "Grade 8", sections: 3, students: 141, subjects: 11, teacher: "Dr. Sara Malik" },
  { name: "Grade 9", sections: 2, students: 96, subjects: 9, teacher: "Bilal Mahmood" },
  { name: "Grade 10", sections: 2, students: 91, subjects: 9, teacher: "Emma Thompson" },
];

export default function AcademicsPage() {
  return <><PageHeader title="Academic setup" subtitle="Configure years, classes, sections, subjects, and teacher assignments." action={<Button><Plus />Add class</Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Academic year" value="2026–27" helper="Current · Apr 2026–Mar 2027" icon={CalendarRange} /><StatCard label="Classes" value="12" helper="29 active sections" icon={School} tone="info" /><StatCard label="Subjects" value="18" helper="Across all grades" icon={BookOpen} tone="success" /><StatCard label="Assignments" value="47" helper="3 need a teacher" icon={Users} tone="warning" /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Classes and sections</CardTitle><Button size="sm" variant="outline"><Plus />New section</Button></CardHeader><CardContent className="space-y-3">{classRows.map((row) => <div className="grid items-center gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto_auto_auto]" key={row.name}><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><GraduationCap className="size-5" /></span><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">Coordinator: {row.teacher}</p></div></div><Badge variant="outline">{row.sections} sections</Badge><span className="text-sm text-muted-foreground">{row.students} students</span><span className="text-sm text-muted-foreground">{row.subjects} subjects</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Academic years</CardTitle></CardHeader><CardContent className="space-y-3">{[{ name: "2026–27", status: "Current", dates: "1 Apr 2026 – 31 Mar 2027" }, { name: "2025–26", status: "Closed", dates: "1 Apr 2025 – 31 Mar 2026" }, { name: "2024–25", status: "Archived", dates: "1 Apr 2024 – 31 Mar 2025" }].map((year) => <div className="rounded-lg border p-4" key={year.name}><div className="flex items-center justify-between"><p className="font-semibold">{year.name}</p><Badge variant={year.status === "Current" ? "success" : "secondary"}>{year.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{year.dates}</p></div>)}<Button className="w-full" variant="outline"><Plus />Create academic year</Button></CardContent></Card></div></>;
}
