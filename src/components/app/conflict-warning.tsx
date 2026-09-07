import { useState } from "react";
import { toast } from "sonner";
import { assignJob, checkAssignConflicts, type ConflictHit } from "@/lib/sweepbook/jobs";
import { formatDateTime } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SHOW_MAX = 8;

export function conflictLine(hit: ConflictHit) {
  return `${hit.cleanerName} is already with ${hit.otherClientName} on ${formatDateTime(hit.otherStartAt)}.`;
}

export function ConflictWarningDialog({
  open,
  conflicts,
  busy,
  onBack,
  onSaveAnyway,
}: {
  open: boolean;
  conflicts: ConflictHit[];
  busy?: boolean;
  onBack: () => void;
  onSaveAnyway: () => void | Promise<void>;
}) {
  const shown = conflicts.slice(0, SHOW_MAX);
  const extra = conflicts.length - shown.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onBack()}>
      <DialogContent title="This overlaps another visit">
        <p className="text-sm text-muted">
          The same cleaner is already booked at a time that overlaps. Back-to-back visits are fine. You can still save.
        </p>
        <ul className="mt-3 grid gap-2">
          {shown.map((hit) => (
            <li
              key={`${hit.cleanerUserId}-${hit.otherJobId}-${hit.otherStartAt}`}
              className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn"
            >
              {conflictLine(hit)}
            </li>
          ))}
        </ul>
        {extra > 0 ? (
          <p className="mt-2 text-xs text-muted">
            And {extra} more overlapping visit{extra === 1 ? "" : "s"}.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
            Go back
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onSaveAnyway()}>
            {busy ? "Saving…" : "Save anyway"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAssignConflictGate() {
  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    jobId: string;
    assignedToUserIds: string[];
    scope: "visit" | "client_recurring";
    onSaved: () => Promise<void>;
  } | null>(null);

  async function requestAssign(input: {
    jobId: string;
    assignedToUserIds: string[];
    scope: "visit" | "client_recurring";
    onSaved: () => Promise<void>;
  }) {
    setBusy(true);
    try {
      const res = await checkAssignConflicts({
        data: {
          jobId: input.jobId,
          assignedToUserIds: input.assignedToUserIds,
          scope: input.scope,
        },
      });
      if (!res.conflicts.length) {
        await assignJob({
          data: {
            id: input.jobId,
            assignedToUserIds: input.assignedToUserIds,
            scope: input.scope,
          },
        });
        toast.success(input.scope === "visit" ? "This visit updated." : "Recurring jobs updated.");
        await input.onSaved();
        return;
      }
      setPending(input);
      setConflicts(res.conflicts);
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check assignments.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnyway() {
    if (!pending) return;
    setBusy(true);
    try {
      await assignJob({
        data: {
          id: pending.jobId,
          assignedToUserIds: pending.assignedToUserIds,
          scope: pending.scope,
        },
      });
      toast.success(pending.scope === "visit" ? "This visit updated." : "Recurring jobs updated.");
      await pending.onSaved();
      setOpen(false);
      setPending(null);
      setConflicts([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <ConflictWarningDialog
      open={open}
      conflicts={conflicts}
      busy={busy}
      onBack={() => {
        setOpen(false);
        setPending(null);
      }}
      onSaveAnyway={saveAnyway}
    />
  );

  return { requestAssign, busy, dialog };
}
