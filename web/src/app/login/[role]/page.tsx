import { notFound } from "next/navigation";

import { RoleLoginPage } from "@/components/role-login-page";
import type { Role } from "@/lib/mock-data";

const roles: Role[] = ["admin", "teacher", "student", "parent"];

export function generateStaticParams() {
  return roles.map((role) => ({ role }));
}

export default function LoginRolePage({ params }: { params: { role: string } }) {
  if (!roles.includes(params.role as Role)) notFound();
  return <RoleLoginPage role={params.role as Role} />;
}
