import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Inbox,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimeExamples } from "@/components/date-time-examples";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const palette = [
  { name: "Primary", token: "bg-primary", text: "text-primary-foreground", hex: "#4F46E5" },
  { name: "Brand secondary", token: "bg-brand-secondary", text: "text-white", hex: "#0F766E" },
  { name: "Success", token: "bg-success", text: "text-success-foreground", hex: "#15803D" },
  { name: "Warning", token: "bg-warning", text: "text-warning-foreground", hex: "#B45309" },
  { name: "Info", token: "bg-info", text: "text-info-foreground", hex: "#0369A1" },
  { name: "Destructive", token: "bg-destructive", text: "text-destructive-foreground", hex: "#DC2626" },
];

const chartColours = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"];

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 border-t border-border py-12 sm:py-16" id={id}>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function Swatch({ name, token, text, hex }: (typeof palette)[number]) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-card">
      <div className={cn("flex h-24 items-end p-4", token, text)}>
        <span className="text-sm font-semibold">Aa</span>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold">{name}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{hex}</p>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpenCheck aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">EduCore</p>
              <p className="mt-1 text-xs text-muted-foreground">Design system · v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
              <Link href="/">
                <ArrowLeft aria-hidden="true" /> Home
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="page-container">
        <div className="relative py-16 sm:py-24">
          <div aria-hidden="true" className="surface-grid absolute inset-x-0 top-0 -z-10 h-full" />
          <Badge variant="info">Foundation</Badge>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
            A calm, accessible system for busy school days.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Shared visual tokens and interaction patterns for every EduCore role, from the principal&apos;s office to a parent checking fees on mobile.
          </p>
        </div>

        <Section
          description="Semantic colours use readable foreground pairs and always combine colour with labels or icons when communicating status."
          eyebrow="01 · Foundations"
          id="colours"
          title="Colour system"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {palette.map((colour) => <Swatch key={colour.name} {...colour} />)}
          </div>
          <div className="mt-6 rounded-lg bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Chart sequence</p>
                <p className="mt-1 text-xs text-muted-foreground">Use direct labels or patterns in addition to hue.</p>
              </div>
              <div className="flex overflow-hidden rounded-full border-2 border-card shadow-sm" aria-label="Chart colour palette">
                {chartColours.map((colour, index) => (
                  <span className={cn("size-8", colour)} key={colour} title={`Chart colour ${index + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          description="Inter keeps dense interfaces highly readable. Plus Jakarta Sans adds a distinct voice to headings and high-value numbers."
          eyebrow="02 · Foundations"
          title="Typography"
        >
          <div className="space-y-4 rounded-lg bg-card p-6 shadow-card sm:p-8">
            <div className="border-b border-border pb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Display · Plus Jakarta Sans</p>
              <p className="mt-3 font-display text-4xl font-bold tracking-tight">Learning, clearly managed.</p>
            </div>
            <div className="grid gap-6 pt-2 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Body · Inter</p>
                <p className="mt-3 leading-7">Attendance, results, fees, and communication in one reliable place for the whole school community.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tabular figures</p>
                <p className="mt-3 font-display text-3xl font-bold tabular-nums">PKR 248,500</p>
                <p className="mt-1 text-sm text-muted-foreground">Collected this month · +12.4%</p>
              </div>
            </div>
          </div>
        </Section>

        <Section
          description="Controls keep a 44px mobile touch target, clear hierarchy, and a visible keyboard focus ring."
          eyebrow="03 · Components"
          title="Buttons & controls"
        >
          <div className="space-y-6 rounded-lg bg-card p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap gap-3">
              <Button><Plus aria-hidden="true" /> Add student</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive"><Trash2 aria-hidden="true" /> Delete</Button>
              <Button disabled><LoaderCircle aria-hidden="true" className="animate-spin" /> Saving</Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Email address
                <span className="relative">
                  <Mail aria-hidden="true" className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="ps-10" defaultValue="ayesha.khan@example.edu" type="email" />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Class
                <span className="relative">
                  <select className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pe-10 text-sm shadow-sm">
                    <option>Grade 8 · Section A</option>
                    <option>Grade 8 · Section B</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                Search students
                <span className="relative">
                  <Search aria-hidden="true" className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="ps-10" placeholder="Search by name, roll number, or admission number…" />
                </span>
              </label>
            </div>
          </div>
        </Section>

        <Section
          id="date-time"
          description="Select dates from a calendar and choose times in a focused dialog. Apply confirms the selection; Cancel keeps the previous value."
          eyebrow="Selection controls"
          title="Dates & times"
        >
          <DateTimeExamples />
        </Section>

        <Section
          description="Every status includes a readable label and icon. Compact attendance codes remain accessible through an aria-label."
          eyebrow="04 · Components"
          title="Badges & status"
        >
          <div className="space-y-6 rounded-lg bg-card p-6 shadow-card sm:p-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Attendance</p>
              <div className="flex flex-wrap gap-2">
                {(["present", "absent", "late", "leave", "holiday"] as const).map((value) => (
                  <StatusBadge key={value} value={value} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fees</p>
              <div className="flex flex-wrap gap-2">
                {(["paid", "partial", "unpaid", "overdue", "waived"] as const).map((value) => (
                  <StatusBadge key={value} value={value} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Students</p>
              <div className="flex flex-wrap gap-2">
                {(["active", "inactive", "withdrawn", "alumni"] as const).map((value) => (
                  <StatusBadge key={value} value={value} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          description="Async views share predictable loading, empty, success, and error treatments so users always know what is happening."
          eyebrow="05 · Patterns"
          title="Interface states"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary" />
                <p className="font-semibold">Loading student records</p>
              </div>
              <div className="mt-6 space-y-3" aria-label="Loading" role="status">
                <div className="skeleton-shimmer h-10 rounded-md" />
                <div className="skeleton-shimmer h-10 rounded-md" />
                <div className="skeleton-shimmer h-10 rounded-md" />
              </div>
            </div>
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-card p-6 text-center shadow-card">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Inbox aria-hidden="true" className="size-6" />
              </div>
              <p className="mt-4 font-semibold">No notices yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">New school and class announcements will appear here.</p>
              <Button className="mt-5" size="sm" variant="outline">Post first notice</Button>
            </div>
            <div className="rounded-lg border border-success/20 bg-success-soft p-5 text-success">
              <div className="flex gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div><p className="font-semibold">Attendance saved</p><p className="mt-1 text-sm">32 student records were updated successfully.</p></div>
              </div>
            </div>
            <div className="rounded-lg border border-destructive/20 bg-danger-soft p-5 text-destructive">
              <div className="flex gap-3">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div><p className="font-semibold">Couldn&apos;t generate vouchers</p><p className="mt-1 text-sm">The due date must be after the issue date. Update it and try again.</p></div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
