import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, change, trend = "up", icon: Icon, helper, tone = "primary" }: {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  helper?: string;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-lg", tones[tone])}><Icon aria-hidden="true" className="size-5" /></span>
      </div>
      {(change || helper) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {change ? <span className={cn("inline-flex items-center gap-0.5 font-semibold", trend === "up" ? "text-success" : "text-destructive")}>
            {trend === "up" ? <ArrowUpRight aria-hidden="true" className="size-3.5" /> : <ArrowDownRight aria-hidden="true" className="size-3.5" />}{change}
          </span> : null}
          <span className="text-muted-foreground">{helper}</span>
        </div>
      )}
    </Card>
  );
}
