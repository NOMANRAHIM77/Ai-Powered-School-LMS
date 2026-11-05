"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);

    try {
      await api.post("/auth/logout");
    } catch {
      // Local logout must still succeed if the session is expired or the API is offline.
    } finally {
      window.localStorage.removeItem("educore-access-token");
      window.localStorage.removeItem("educore-role");
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <button
      aria-label="Log out"
      className={cn(
        "mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-danger-soft disabled:cursor-wait disabled:opacity-70",
        compact && "justify-center px-0",
      )}
      disabled={loading}
      onClick={logout}
      title={compact ? "Log out" : undefined}
      type="button"
    >
      {loading ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <LogOut aria-hidden="true" className="size-5" />}
      {!compact && <span>{loading ? "Signing out…" : "Log out"}</span>}
    </button>
  );
}
