import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel = "Remove",
  busyLabel = "Removing…",
  busy,
  confirmVariant = "danger",
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        {body ? <p className="text-sm text-muted">{body}</p> : null}
        {children}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} disabled={busy} onClick={() => void onConfirm()}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure you want to cancel this appointment?"
      body="The visit will stay on the calendar as Cancelled."
      cancelLabel="Keep appointment"
      confirmLabel="Cancel appointment"
      busyLabel="Cancelling…"
      busy={busy}
      onConfirm={onConfirm}
    />
  );
}

export function RemoveAppointmentDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this appointment?"
      body="Remove this appointment? It will disappear from the calendar. Use this for a booking mistake."
      cancelLabel="Keep appointment"
      confirmLabel="Remove appointment"
      busyLabel="Removing…"
      busy={busy}
      onConfirm={onConfirm}
    />
  );
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: (note: string | null) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote("");
  }, [open]);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark this appointment as paid without charging a card?"
      body="The visit is marked paid. No card is charged. Home revenue and Payments will include it."
      cancelLabel="Cancel"
      confirmLabel="Mark as Paid"
      busyLabel="Saving…"
      confirmVariant="primary"
      busy={busy}
      onConfirm={() => onConfirm(note.trim() || null)}
    >
      <Field label="How they paid" hint="Optional — Venmo, cash, Zelle, check, etc.">
        <Input
          value={note}
          maxLength={120}
          placeholder="Venmo, cash, Zelle, check…"
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
