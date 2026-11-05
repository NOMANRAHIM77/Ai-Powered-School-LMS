import { ArrowUpRight, BookOpenCheck, GraduationCap, ShieldCheck, Users, UserRound } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const portals = [
  { role: "student", title: "Student", description: "Classes, attendance, fees, results, and notices in one place.", icon: GraduationCap, accent: "bg-info-soft text-info", border: "hover:border-info/50" },
  { role: "teacher", title: "Teacher", description: "Manage classes, mark attendance, enter results, and teach with clarity.", icon: UserRound, accent: "bg-success-soft text-success", border: "hover:border-success/50" },
  { role: "admin", title: "Administrator", description: "Run academics, people, fees, reports, and school-wide operations.", icon: ShieldCheck, accent: "bg-accent text-accent-foreground", border: "hover:border-primary/50" },
  { role: "parent", title: "Parent", description: "Follow your child’s progress, payments, attendance, and announcements.", icon: Users, accent: "bg-warning-soft text-warning", border: "hover:border-warning/50" },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,hsl(var(--primary)/0.14),transparent_28%),radial-gradient(circle_at_88%_82%,hsl(var(--brand-secondary)/0.13),transparent_30%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><BookOpenCheck aria-hidden="true" className="size-6" /></span><div><p className="font-display text-lg font-bold leading-none">EduCore</p><p className="mt-1 text-xs text-muted-foreground">Bright Future Academy</p></div></div>
          <ThemeToggle />
        </header>
        <section className="my-auto py-14 text-center sm:py-20">
          <span className="inline-flex items-center rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">Secure school portal</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Welcome to your school workspace</h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">Choose how you’re signing in to continue to your role’s portal.</p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 text-start sm:grid-cols-2 lg:gap-5">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return <Link className={cn("group relative overflow-hidden rounded-2xl border bg-card/90 p-6 shadow-card backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", portal.border)} href={`/login/${portal.role}`} key={portal.role}><div className="flex items-start gap-4"><span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", portal.accent)}><Icon aria-hidden="true" className="size-6" /></span><div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">Login as {portal.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{portal.description}</p></div><ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><p className="mt-5 border-t pt-4 text-xs font-semibold text-primary">Open {portal.title.toLowerCase()} portal</p></Link>;
            })}
          </div>
        </section>
        <footer className="flex flex-col items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row"><p>© 2026 Bright Future Academy</p><p>Secure access · Role-based workspace</p></footer>
      </div>
    </main>
  );
}
