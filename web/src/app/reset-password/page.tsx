"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setError("This reset link is missing its token."); return; }
    setLoading(true);
    try { await api.post("/auth/reset-password", { token, password }); setMessage("Your password has been reset. You can now sign in."); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to reset your password."); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center p-5"><div className="w-full max-w-md rounded-xl bg-card p-8 shadow-card"><h1 className="font-display text-3xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>{!message && <form className="mt-7 space-y-4" onSubmit={submit}><label className="grid gap-2 text-sm font-semibold">New password<Input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Confirm password<Input type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving…" : "Reset password"}</Button></form>}{message && <p role="status" className="mt-5 text-sm text-success">{message}</p>}<Button asChild className="mt-4 w-full" variant="outline"><Link href="/login/student">Back to sign in</Link></Button></div></main>;
}
