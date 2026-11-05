"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function ConfirmationModal({ title, description, confirmLabel, onConfirm, onClose, children }: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const opener = useRef(typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null);

  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try { await onConfirm(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to complete this action. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !pending.current) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-2xl focus:outline-none"
          onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            const target = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>('input[type="search"]');
            target?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={event => { if (pending.current) event.preventDefault(); }}
          onInteractOutside={event => event.preventDefault()}
          aria-busy={busy}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-destructive"><AlertTriangle className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-lg font-bold">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-8 min-h-8 shrink-0" disabled={busy} aria-label="Close confirmation"><X /></Button></Dialog.Close>
          </div>
          {children && <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-sm">{children}</div>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Dialog.Close asChild><Button ref={cancel} type="button" variant="outline" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirm()}>{busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}{busy ? "Removing…" : confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  requireText,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireText?: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const allowed = !requireText || value === requireText;

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warning-soft text-warning"><AlertTriangle className="size-5" /></span>
              <div className="min-w-0 flex-1"><h2 id="confirm-title" className="font-display text-lg font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
              <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)} aria-label="Close"><X className="size-4" /></button>
            </div>
            {requireText && <label className="mt-5 grid gap-2 text-sm font-medium">Type <strong>{requireText}</strong> to continue<input className="h-11 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" value={value} onChange={(event) => setValue(event.target.value)} /></label>}
            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant={destructive ? "destructive" : "default"} disabled={!allowed} onClick={() => { onConfirm(); setOpen(false); setValue(""); }}>{confirmLabel}</Button></div>
          </section>
        </div>
      )}
    </>
  );
}
