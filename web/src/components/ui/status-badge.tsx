import { CalendarDays, Check, Clock3, GraduationCap, Info, Minus, X } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusConfig = {
  label: string;
  shortLabel?: string;
  variant: NonNullable<BadgeProps["variant"]>;
  icon: typeof Check;
};

const statuses: Record<string, StatusConfig> = {
  present: { label: "Present", shortLabel: "P", variant: "success", icon: Check },
  absent: { label: "Absent", shortLabel: "A", variant: "destructive", icon: X },
  late: { label: "Late", shortLabel: "L", variant: "warning", icon: Clock3 },
  leave: { label: "Leave", shortLabel: "Lv", variant: "info", icon: CalendarDays },
  holiday: { label: "Holiday", shortLabel: "H", variant: "secondary", icon: Minus },
  paid: { label: "Paid", variant: "success", icon: Check },
  partial: { label: "Partial", variant: "warning", icon: Clock3 },
  unpaid: { label: "Unpaid", variant: "outline", icon: Minus },
  overdue: { label: "Overdue", variant: "destructive", icon: X },
  waived: { label: "Waived", variant: "info", icon: Info },
  active: { label: "Active", variant: "success", icon: Check },
  inactive: { label: "Inactive", variant: "secondary", icon: Minus },
  withdrawn: { label: "Withdrawn", variant: "destructive", icon: X },
  alumni: { label: "Alumni", variant: "info", icon: GraduationCap },
  pass: { label: "Pass", variant: "success", icon: Check },
  fail: { label: "Fail", variant: "destructive", icon: X },
};

interface StatusBadgeProps {
  value: keyof typeof statuses;
  compact?: boolean;
}

export function StatusBadge({ value, compact = false }: StatusBadgeProps) {
  const status = statuses[value];
  const Icon = status.icon;

  return (
    <Badge aria-label={status.label} variant={status.variant}>
      <Icon aria-hidden="true" className="size-3.5" />
      {compact && status.shortLabel ? status.shortLabel : status.label}
    </Badge>
  );
}
