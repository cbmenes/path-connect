import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        {body ? <p className="text-sm text-muted">{body}</p> : null}
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
  series,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  series?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure you want to cancel this appointment?"
      body={
        series
          ? "This visit and future visits in the series will be cancelled."
          : "The visit will be marked cancelled and removed from the book."
      }
      cancelLabel="Keep appointment"
      confirmLabel="Cancel appointment"
      busyLabel="Cancelling…"
      busy={busy}
      onConfirm={onConfirm}
    />
  );
}
