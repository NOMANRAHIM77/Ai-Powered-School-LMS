import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PrintLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <article className={cn("print-page mx-auto max-w-[210mm] bg-white p-8 text-slate-900 shadow-card print:max-w-none print:p-0 print:shadow-none", className)}>{children}</article>;
}
