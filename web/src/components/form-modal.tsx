"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function FormModal({ title, description, formId, submitLabel, busy = false, submitDisabled = false, error, onClose, children }: {
  title: string;
  description: string;
  formId: string;
  submitLabel: string;
  busy?: boolean;
  submitDisabled?: boolean;
  error?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const opener = useRef(typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null);

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          ref={content}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl focus:outline-none"
          onOpenAutoFocus={event => {
            const input = content.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
            if (input) { event.preventDefault(); input.focus({ preventScroll: true }); }
          }}
          onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }}
          onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
          onPointerDownOutside={event => { if (busy) event.preventDefault(); }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl font-bold">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" disabled={busy} className="shrink-0" aria-label="Close form"><X /></Button></Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6" aria-busy={busy}>{children}</div>
          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-card px-5 py-4 sm:px-6">
            {error && <p role="alert" className="w-full rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
            <Dialog.Close asChild><Button type="button" variant="outline" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" form={formId} disabled={busy || submitDisabled}>{busy && <LoaderCircle className="animate-spin" />}{submitLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
