import { cn } from "@/lib/utils";

export function AvatarWithFallback({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground", className)} aria-hidden="true">
      {initials}
    </span>
  );
}
