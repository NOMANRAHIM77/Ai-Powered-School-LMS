"use client";

import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FormModal } from "./form-modal";

export function DateTimeExamples() {
  const [date, setDate] = useState("2026-11-05");
  const [deadline, setDeadline] = useState("2026-11-06T09:30");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return <div className="space-y-5 rounded-lg bg-card p-6 shadow-card sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">Attendance date<Input id="example-date" type="date" min="2026-11-01" max="2026-11-30" value={date} onChange={e => setDate(e.target.value)} /><span className="text-xs font-normal text-muted-foreground">Choose any day in November 2026.</span></label>
      <label className="grid gap-2 text-sm font-semibold">Quiz deadline<Input id="example-deadline" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
      <label className="grid gap-2 text-sm font-semibold">Lesson time<Input id="example-time" type="time" defaultValue="09:30" /></label>
      <label className="grid gap-2 text-sm font-semibold">Locked date<Input type="date" defaultValue="2026-11-05" disabled /></label>
    </div>
    <Button variant="outline" onClick={() => { setSaved(false); setOpen(true); }}>Preview in a form</Button>
    {saved && <p role="status" className="text-sm text-success">Example selections saved.</p>}
    {open && <FormModal title="Example scheduling form" description="Choose dates and a time to preview the selection controls." formId="example-date-form" submitLabel="Save example" onClose={() => setOpen(false)}>
      <form id="example-date-form" className="space-y-4" onSubmit={event => { event.preventDefault(); setSaved(true); setOpen(false); }}>
        <label className="grid gap-2 text-sm font-semibold">Start date<Input id="example-start" type="date" name="start" required /></label>
        <label className="grid gap-2 text-sm font-semibold">End date<Input id="example-end" type="date" name="end" required /></label>
        <label className="grid gap-2 text-sm font-semibold">Start time<Input id="example-start-time" type="time" name="time" defaultValue="09:00" /></label>
      </form>
    </FormModal>}
  </div>;
}
