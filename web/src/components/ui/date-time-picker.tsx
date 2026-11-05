"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DayPicker } from "react-day-picker";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { CalendarDays, Check, ChevronDown, Clock3, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type PickerType = "date" | "datetime-local" | "time";
type Props = React.ComponentProps<"input"> & { type: PickerType };
const pad = (n: number) => String(n).padStart(2, "0");
function asDate(value: string) { const date = parseISO(value); return isValid(date) ? date : undefined; }
function displayValue(value: string, type: PickerType) {
  if (!value) return "";
  const date = asDate(type === "time" ? `2000-01-01T${value}` : value);
  return date ? format(date, type === "date" ? "dd MMM yyyy" : type === "time" ? "hh:mm a" : "dd MMM yyyy · hh:mm a") : "";
}

/** Keeps native input values, validation and form events behind a modal picker. */
export const DateTimePicker = React.forwardRef<HTMLInputElement, Props>(function DateTimePicker(
  { type, className, value, defaultValue, onChange, onInvalid, id, disabled, readOnly, placeholder, ...props }, forwardedRef,
) {
  const input = React.useRef<HTMLInputElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [uncontrolled, setUncontrolled] = React.useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value ?? "") : uncontrolled;
  const [open, setOpen] = React.useState(false);
  const [day, setDay] = React.useState<Date>();
  const [month, setMonth] = React.useState<Date>();
  const [time, setTime] = React.useState("09:00");
  const [error, setError] = React.useState("");
  const [label, setLabel] = React.useState("");
  const hasDate = type !== "time", hasTime = type !== "date";
  const min = props.min ? String(props.min) : "", max = props.max ? String(props.max) : "";
  const minDay = hasDate && min ? asDate(min) : undefined, maxDay = hasDate && max ? asDate(max) : undefined;
  const heading = type === "date" ? "Choose a date" : type === "time" ? "Choose a time" : "Choose date & time";
  const [hour = "09", minute = "00", second = "00"] = time.split(":");
  const showSeconds = hasTime && ((props.step !== undefined && props.step !== "any" && Number(props.step) < 60) || time.split(":").length > 2);
  const selected = hasDate ? day ? `${format(day, "yyyy-MM-dd")}${hasTime ? `T${time}` : ""}` : "" : time;
  const formatted = displayValue(current, type);

  React.useImperativeHandle(forwardedRef, () => input.current!);
  React.useEffect(() => {
    const form = input.current?.form;
    const reset = () => { if (value === undefined) setUncontrolled(String(defaultValue ?? "")); setOpen(false); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [value, defaultValue]);

  function openPicker() {
    if (disabled || readOnly || input.current?.matches(":disabled")) return;
    const now = new Date();
    const date = hasDate ? asDate(current) : undefined;
    setDay(date); setMonth(date ?? (minDay && now < minDay ? minDay : maxDay && now > maxDay ? maxDay : now));
    setTime((type === "time" ? current : current.split("T")[1]) || `${pad(now.getHours())}:${pad(now.getMinutes())}`);
    const parentLabel = trigger.current?.closest("label");
    setLabel(props["aria-label"] ?? Array.from(parentLabel?.childNodes ?? []).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(" ").trim());
    setError(""); setOpen(true);
  }
  function commit(next: string) {
    const element = input.current;
    if (!element || element.matches(":disabled") || readOnly) return;
    const probe = element.cloneNode() as HTMLInputElement;
    probe.value = next;
    if (!probe.checkValidity()) { setError(probe.validationMessage || "Please choose an allowed date and time."); return; }
    // Bypass React's value tracker so controlled forms receive a genuine change event.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, next);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false); setError("");
  }
  function setClock(nextHour = hour, nextMinute = minute, nextSecond = second) {
    setTime(`${nextHour}:${nextMinute}${showSeconds ? `:${nextSecond}` : ""}`); setError("");
  }
  function useToday() {
    const now = new Date();
    if (hasDate) { setDay(startOfDay(now)); setMonth(now); }
    if (hasTime) setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}${showSeconds ? `:${pad(now.getSeconds())}` : ""}`);
    setError("");
  }

  return <span className="relative block w-full min-w-0">
    <Dialog.Root open={open} onOpenChange={next => { if (next) openPicker(); else setOpen(false); }}>
      <Dialog.Trigger asChild>
        <button ref={trigger} id={id} type="button" disabled={disabled || readOnly}
          aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"]}
          className={cn("flex h-11 w-full min-w-0 items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-start text-base font-normal text-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)}>
          {hasDate ? <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" /> : <Clock3 aria-hidden="true" className="size-4 shrink-0 text-primary" />}
          <span className={cn("min-w-0 flex-1 truncate", !formatted && "text-muted-foreground")}>{formatted || placeholder || (hasDate ? hasTime ? "Select date and time" : "Select date" : "Select time")}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Dialog.Trigger>
      <input {...props} ref={input} id={id ? `${id}-value` : undefined} type={type} disabled={disabled} readOnly={readOnly}
        value={current} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute bottom-0 start-0 h-px w-px opacity-0"
        onFocus={() => trigger.current?.focus()}
        onChange={event => { if (value === undefined) setUncontrolled(event.target.value); onChange?.(event); }}
        onInvalid={event => {
          onInvalid?.(event); event.preventDefault();
          const firstInvalid = input.current?.form?.querySelector("input:invalid, select:invalid, textarea:invalid");
          if (!firstInvalid || firstInvalid === input.current) openPicker();
        }} />
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl focus:outline-none"
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}
          onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}
          onClick={event => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div><Dialog.Title className="font-display text-lg font-bold">{heading}</Dialog.Title><Dialog.Description className="mt-1 text-xs text-muted-foreground">{label ? `${label}. ` : ""}{hasDate ? "Pick a day from the calendar." : "Choose the hour and minute."}</Dialog.Description></div>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-8 min-h-8" aria-label="Close date and time picker"><X /></Button></Dialog.Close>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {hasDate && <DayPicker mode="single" selected={day} onSelect={date => { setDay(date); setError(""); }} month={month} onMonthChange={setMonth}
              captionLayout="dropdown" navLayout="around" showOutsideDays fixedWeeks weekStartsOn={1} autoFocus
              startMonth={minDay ?? new Date(Math.min(1900, day?.getFullYear() ?? 1900), 0)}
              endMonth={maxDay ?? new Date(Math.max(new Date().getFullYear() + 20, day?.getFullYear() ?? 0), 11)}
              disabled={[...(minDay ? [{ before: startOfDay(minDay) }] : []), ...(maxDay ? [{ after: startOfDay(maxDay) }] : [])]}
              className="lms-calendar mx-auto" />}
            {hasTime && <div className={cn("space-y-3", hasDate && "border-t pt-4")}>
              <p className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary" aria-hidden="true" />Time</p>
              <div className={cn("grid gap-2", showSeconds ? "grid-cols-4" : "grid-cols-3")}>
                <label className="grid gap-1.5 text-xs text-muted-foreground">Hour<select aria-label="Hour" className="h-12 w-full rounded-lg border bg-muted/60 px-2 text-base font-semibold text-foreground" value={String(Number(hour) % 12 || 12)} onChange={e => setClock(pad(Number(e.target.value) % 12 + (Number(hour) >= 12 ? 12 : 0)))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{pad(i + 1)}</option>)}</select></label>
                <label className="grid gap-1.5 text-xs text-muted-foreground">Minute<select aria-label="Minute" className="h-12 w-full rounded-lg border bg-muted/60 px-2 text-base font-semibold text-foreground" value={minute} onChange={e => setClock(hour, e.target.value)}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={pad(i)}>{pad(i)}</option>)}</select></label>
                {showSeconds && <label className="grid gap-1.5 text-xs text-muted-foreground">Second<select aria-label="Second" className="h-12 w-full rounded-lg border bg-muted/60 px-2 text-base font-semibold text-foreground" value={second} onChange={e => setClock(hour, minute, e.target.value)}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={pad(i)}>{pad(i)}</option>)}</select></label>}
                <label className="grid gap-1.5 text-xs text-muted-foreground">Period<select aria-label="AM or PM" className="h-12 w-full rounded-lg border bg-muted/60 px-2 text-base font-semibold text-foreground" value={Number(hour) >= 12 ? "PM" : "AM"} onChange={e => setClock(pad(Number(hour) % 12 + (e.target.value === "PM" ? 12 : 0)))}><option>AM</option><option>PM</option></select></label>
              </div>
              <p className="text-xs text-muted-foreground">Uses your device&apos;s local time.</p>
            </div>}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm"><span className="font-medium">{displayValue(selected, type) || "No date selected"}</span><Button type="button" variant="ghost" size="sm" onClick={useToday}>{hasTime ? "Now" : "Today"}</Button></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3 sm:px-5">
            {!props.required && <Button type="button" variant="ghost" size="sm" onClick={() => commit("")}>Clear</Button>}
            <div className="ms-auto flex gap-2"><Dialog.Close asChild><Button type="button" variant="outline" size="sm">Cancel</Button></Dialog.Close><Button type="button" size="sm" disabled={!selected} onClick={() => commit(selected)}><Check />Apply</Button></div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </span>;
});
