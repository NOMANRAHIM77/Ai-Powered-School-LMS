"use client";

import * as React from "react";
import { DateTimePicker } from "./date-time-picker";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => type === "date" || type === "datetime-local" || type === "time" ? (
    <DateTimePicker ref={ref} type={type as "date" | "datetime-local" | "time"} className={className} {...props} />
  ) : (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
