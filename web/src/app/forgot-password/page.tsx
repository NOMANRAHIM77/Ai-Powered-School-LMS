"use client";

import { ArrowLeft, BookOpenCheck, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try { await api.post("/auth/forgot-password", { email }); setMessage("If an account exists, a reset link has been sent."); }
    catch { setError("Unable to send the reset link. Please try again later."); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center p-5"><div className="w-full max-w-md rounded-xl bg-card p-8 shadow-card"><span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck aria-hidden="true" className="size-5" /></span><h1 className="mt-7 font-display text-3xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">Enter your school email and we&apos;ll send a secure reset link.</p><form onSubmit={submit}><label className="mt-7 grid gap-2 text-sm font-semibold">Email address<span className="relative"><Mail aria-hidden="true" className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-10" placeholder="you@school.edu" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></span></label>{message && <p className="mt-4 text-sm text-success" role="status">{message}</p>}{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}<Button className="mt-5 w-full" disabled={loading} type="submit">{loading ? "Sending…" : "Send reset link"}</Button></form><Button asChild className="mt-3 w-full" variant="ghost"><Link href="/login/student"><ArrowLeft aria-hidden="true" />Back to student sign in</Link></Button></div></main>;
}
