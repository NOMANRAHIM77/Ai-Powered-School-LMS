"use client";

export function TeacherSubjectPicker({ className, stream, subjects, selected, hasSections, onChange }: {
  className: string;
  stream: string;
  subjects: string[];
  selected: string[];
  hasSections: boolean;
  onChange: (subject: string, checked: boolean) => void;
}) {
  return <fieldset className="rounded-lg border border-primary/30 bg-accent/20 p-4 sm:col-span-2" disabled={!hasSections}>
    <legend className="px-1 text-sm font-semibold">Teaching subjects (required) · {className}{stream ? ` · ${stream}` : ''}</legend>
    {!hasSections ? <p className="text-sm text-muted-foreground">Select at least one section above to choose its teaching subjects.</p> : <>
      <p className="mb-3 text-xs text-muted-foreground">Choose one or more subjects for these sections. Only subjects offered in this class and stream are shown.</p>
      <div className="grid gap-2 sm:grid-cols-2">{subjects.map(subject => <label key={subject} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={selected.includes(subject)} onChange={event => onChange(subject, event.target.checked)} />{subject}</label>)}</div>
      {!subjects.length && <p role="alert" className="text-sm text-destructive">Subject options are unavailable. Close and reopen Add teacher to refresh the class options.</p>}
    </>}
  </fieldset>;
}
