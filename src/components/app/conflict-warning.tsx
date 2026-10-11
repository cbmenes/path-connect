import { useState } from "react";
import { toast } from "sonner";
import { assignJob, checkAssignConflicts, type ConflictHit } from "@/lib/sweepbook/jobs";
import { availabilityLine, type AvailabilityHit } from "@/lib/sweepbook/availability";
import type { TimeOffHit } from "@/lib/sweepbook/time-off";
import { formatDateTime } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SHOW_MAX = 8;

export function conflictLine(hit: ConflictHit) {
  return `${hit.cleanerName} is already with ${hit.otherClientName} on ${formatDateTime(hit.otherStartAt)}.`;
}

export function timeOffLine(hit: TimeOffHit) {
  if (hit.status === "pending") return `${hit.name} has pending time off ${hit.dates}.`;
  return `${hit.name} is off ${hit.dates}.`;
}

export function ConflictWarningDialog({
  open,
  conflicts,
  timeOff,
  availability,
  busy,
  onBack,
  onSaveAnyway,
  backLabel,
  saveLabel,
}: {
  open: boolean;
  conflicts: ConflictHit[];
  timeOff?: TimeOffHit[];
  availability?: AvailabilityHit[];
  busy?: boolean;
  onBack: () => void;
  onSaveAnyway: () => void | Promise<void>;
  backLabel?: string;
  saveLabel?: string;
}) {
  const approved = (timeOff ?? []).filter((h) => h.status === "approved");
  const pending = (timeOff ?? []).filter((h) => h.status === "pending");
  const outside = availability ?? [];
  const shown = conflicts.slice(0, SHOW_MAX);
  const extra = conflicts.length - shown.length;
  const shownOutside = outside.slice(0, SHOW_MAX);
  const extraOutside = outside.length - shownOutside.length;
  const title = approved.length
    ? conflicts.length
      ? "Check this assignment"
      : "This cleaner is off"
    : outside.length
      ? conflicts.length
        ? "Check this assignment"
        : "Outside availability"
      : "This overlaps another visit";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onBack()}>
      <DialogContent title={title}>
        {approved.length ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted">
              Assign anyway, or pick someone else. Existing visits stay as they are.
            </p>
            <ul className="grid gap-2">
              {approved.map((hit) => (
                <li key={`${hit.userId}-${hit.requestId}`} className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
                  {timeOffLine(hit)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {pending.length ? (
          <p className="mt-3 text-sm text-muted">
            {pending.map((h) => timeOffLine(h)).join(" ")}
          </p>
        ) : null}
        {outside.length ? (
          <div className={approved.length ? "mt-4" : ""}>
            <p className="text-sm text-muted">
              This visit is outside their weekly availability. Assign anyway, or pick someone else.
            </p>
            <ul className="mt-3 grid gap-2">
              {shownOutside.map((hit) => (
                <li key={`${hit.userId}-${hit.when}`} className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
                  {availabilityLine(hit)}
                </li>
              ))}
            </ul>
            {extraOutside > 0 ? (
              <p className="mt-2 text-xs text-muted">
                And {extraOutside} more day{extraOutside === 1 ? "" : "s"} outside availability.
              </p>
            ) : null}
          </div>
        ) : null}
        {conflicts.length ? (
          <>
            <p className={`text-sm text-muted ${approved.length ? "mt-4" : ""}`}>
              The same cleaner is already booked at a time that overlaps. Back-to-back visits are fine. You can still
              save.
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
          </>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
            {backLabel ?? (approved.length ? "Pick someone else" : "Go back")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onSaveAnyway()}>
            {busy ? "Saving…" : saveLabel ?? (approved.length || outside.length ? "Assign anyway" : "Save anyway")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAssignConflictGate() {
  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffHit[]>([]);
  const [availability, setAvailability] = useState<AvailabilityHit[]>([]);
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
      const approved = (res.timeOff ?? []).filter((h) => h.status === "approved");
      const outside = res.availability ?? [];
      if (!res.conflicts.length && !approved.length && !outside.length) {
        await assignJob({
          data: {
            id: input.jobId,
            assignedToUserIds: input.assignedToUserIds,
            scope: input.scope,
          },
        });
        toast.success(input.scope === "visit" ? "This visit updated." : "Recurring jobs updated.");
        if ((res.timeOff ?? []).some((h) => h.status === "pending")) {
          toast.message("A cleaner has pending time off on this day.");
        }
        await input.onSaved();
        return;
      }
      setPending(input);
      setConflicts(res.conflicts);
      setTimeOff(res.timeOff ?? []);
      setAvailability(outside);
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
      setTimeOff([]);
      setAvailability([]);
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
      timeOff={timeOff}
      availability={availability}
      busy={busy}
      onBack={() => {
        setOpen(false);
        setPending(null);
        setAvailability([]);
      }}
      onSaveAnyway={saveAnyway}
    />
  );

  return { requestAssign, busy, dialog };
}
