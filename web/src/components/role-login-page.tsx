"use client";

import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Eye, EyeOff, GraduationCap, ShieldCheck, Sparkles, Users, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Role } from "@/lib/mock-data";

const roleDetails = {
  admin: { title: "Administrator", icon: ShieldCheck, email: "principal@educore.edu.pk", description: "Manage your school with a complete operational view." },
  teacher: { title: "Teacher", icon: UserRound, email: "teacher@educore.edu.pk", description: "Open your classes, attendance, and assessment workspace." },
  student: { title: "Student", icon: GraduationCap, email: "student@educore.edu.pk", description: "Continue learning and review your latest progress." },
  parent: { title: "Parent", icon: Users, email: "parent@educore.edu.pk", description: "Stay connected with your child’s school journey." },
} satisfies Record<Role, { title: string; icon: typeof ShieldCheck; email: string; description: string }>;

export function RoleLoginPage({ role }: { role: Role }) {
  const router = useRouter();
  const details = roleDetails[role];
  const RoleIcon = details.icon;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!data.get("email") || !data.get("password")) {
      setError("Enter both your email address and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email: data.get("email"), password: data.get("password") });
      const session = response.data.data;
      if (session.user.role !== role) {
        await api.post("/auth/logout");
        setError(`This account is not a ${details.title.toLowerCase()} account. Please select the correct portal.`);
        setLoading(false);
        return;
      }
      window.localStorage.setItem("educore-access-token", session.accessToken);
      window.localStorage.setItem("educore-role", role);
      router.replace(role === "admin" ? "/admin/users" : role === "student" ? "/student" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to sign in. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#111c4e] p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,#818cf8_0,transparent_30%),radial-gradient(circle_at_80%_70%,#14b8a6_0,transparent_25%)]" />
        <div className="relative flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur"><BookOpenCheck aria-hidden="true" /></span><div><p className="font-display font-bold">EduCore</p><p className="text-xs text-indigo-200">Bright Future Academy</p></div></div>
        <div className="relative my-auto max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-indigo-100"><Sparkles aria-hidden="true" className="size-4" />{details.title} portal</span><h1 className="mt-6 text-balance font-display text-5xl font-bold leading-tight">Your day at school, organized around you.</h1><p className="mt-5 text-lg leading-8 text-indigo-100/80">{details.description}</p><div className="mt-10 grid grid-cols-2 gap-4"><div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur"><GraduationCap aria-hidden="true" className="size-6 text-teal-300" /><p className="mt-4 font-display text-2xl font-bold">1,248</p><p className="text-sm text-indigo-100/70">Students thriving</p></div><div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur"><CheckCircle2 aria-hidden="true" className="size-6 text-teal-300" /><p className="mt-4 font-display text-2xl font-bold">94.2%</p><p className="text-sm text-indigo-100/70">Average attendance</p></div></div></div>
        <p className="relative text-xs text-indigo-100/60">Secure school management · Role-based access</p>
      </section>
      <section className="flex min-h-screen items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between"><Button asChild variant="ghost"><Link href="/"><ArrowLeft />All portals</Link></Button><ThemeToggle /></div>
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><RoleIcon aria-hidden="true" className="size-6" /></div>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">{details.title} sign in</h2>
          <p className="mt-2 text-muted-foreground">Enter your school account to continue.</p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold">Email address<Input autoComplete="email" defaultValue={role === "student" || role === "admin" ? "" : details.email} name="email" placeholder="you@school.edu" type="email" /></label>
            <label className="grid gap-2 text-sm font-semibold">Password<span className="relative"><Input autoComplete="current-password" className="pe-11" defaultValue={role === "student" || role === "admin" ? "" : "demo1234"} name="password" type={showPassword ? "text" : "password"} /><button className="absolute end-0 top-0 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} type="button" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button></span></label>
            <div className="flex items-center justify-between gap-4 text-sm"><label className="flex items-center gap-2"><input className="size-4 rounded border-input accent-primary" type="checkbox" />Remember me</label><Link className="font-semibold text-primary hover:underline" href="/forgot-password">Forgot password?</Link></div>
            {error && <p className="rounded-md border border-destructive/20 bg-danger-soft p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button className="w-full" disabled={loading} size="lg" type="submit">{loading ? "Signing in…" : `Sign in as ${details.title}`}<ArrowRight aria-hidden="true" /></Button>
          </form>
          {role !== "student" && role !== "admin" && <div className="mt-8 rounded-lg bg-muted p-4 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Demo preview</p><p className="mt-1">Use the pre-filled credentials to explore the {details.title.toLowerCase()} workspace.</p></div>}
        </div>
      </section>
    </main>
  );
}
