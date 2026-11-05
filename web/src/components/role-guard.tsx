"use client";

import type { ReactNode } from "react";

import { useCurrentRole } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import type { Role } from "@/lib/mock-data";

export function RoleGuard({ allow, children, fallback }: { allow: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const { role } = useCurrentRole();
  if (!allow.includes(role)) return fallback ?? <EmptyState title="Access restricted" description="Your current role does not have permission to view this area." />;
  return children;
}
