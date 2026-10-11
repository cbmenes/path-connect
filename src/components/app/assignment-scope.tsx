import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { previewAssignmentConflicts } from "@/lib/sweepbook/clients";
import { availabilityLine, type AvailabilityHit } from "@/lib/sweepbook/availability";
import type { TimeOffHit } from "@/lib/sweepbook/time-off";
import { timeOffLine } from "@/components/app/conflict-warning";
import type { AssignmentWhen } from "@/lib/sweepbook/assignees";
import { Button } from "@/components/ui/button";

export function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const ids = new Set(a);
  return b.every((id) => ids.has(id));
}

export function AssignmentSave({
  unchanged,
  previewClientIds,
  previewUserIds,
  disabled,
  onSave,
}: {
  unchanged: boolean;
  previewClientIds: string[];
  previewUserIds: string[];
  disabled?: boolean;
  onSave: (when: AssignmentWhen) => Promise<void>;
}) {
  const [scopeOpen, setScopeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    when: AssignmentWhen;
    timeOff: TimeOffHit[];
    availability: AvailabilityHit[];
  } | null>(null);

  async function choose(when: AssignmentWhen) {
    setBusy(true);
    try {
      const check =
        previewClientIds.length && previewUserIds.length
          ? await previewAssignmentConflicts({
              data: { clientIds: previewClientIds, userIds: previewUserIds, when },
            })
          : { timeOff: [] as TimeOffHit[], availability: [] as AvailabilityHit[] };
      if (check.timeOff.length || check.availability.length) {
        setScopeOpen(false);
        setNotice({ when, timeOff: check.timeOff, availability: check.availability });
        return;
      }
      setScopeOpen(false);
      await onSave(when);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!notice) return;
    const when = notice.when;
    setNotice(null);
    setBusy(true);
    try {
      await onSave(when);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the assignment.");
    } finally {
      setBusy(false);
    }
  }

  const title = notice?.timeOff.length && notice.availability.length
    ? "Time off and availability"
    : notice?.timeOff.length
      ? "Time off"
      : "Availability";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => {
          if (unchanged) {
            toast.message("No assignment changes to save.");
            return;
          }
          setScopeOpen(true);
        }}
      >
        Save
      </Button>
      {scopeOpen ? (
        <ChoiceOverlay title="Apply this assignment to">
          <p className="text-sm text-muted">Past appointments stay as they are.</p>
          <div className="mt-3 grid gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void choose("current")}>
              Current appointments
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void choose("future")}>
              Future appointments
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void choose("both")}>
              Current and future
            </Button>
          </div>
        </ChoiceOverlay>
      ) : null}
      {notice ? (
        <ChoiceOverlay title={title}>
          {notice.timeOff.length ? (
            <div className="grid gap-2">
              <p className="text-sm text-ink">This conflicts with approved time off.</p>
              <ul className="grid gap-2">
                {notice.timeOff.slice(0, 8).map((hit) => (
                  <li key={`${hit.userId}-${hit.requestId}`} className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
                    {timeOffLine(hit)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {notice.availability.length ? (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-ink">This conflicts with availability.</p>
              <ul className="grid gap-2">
                {notice.availability.slice(0, 8).map((hit) => (
                  <li key={`${hit.userId}-${hit.when}`} className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
                    {availabilityLine(hit)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 text-sm text-muted">You can still save this assignment.</p>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setNotice(null)}>
              Go back
            </Button>
            <Button type="button" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Saving…" : "Save anyway"}
            </Button>
          </div>
        </ChoiceOverlay>
      ) : null}
    </>
  );
}

function ChoiceOverlay({ title, children }: { title: string; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-deep/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-[min(100%-1.5rem,28rem)] overflow-y-auto rounded-xl bg-paper p-5 shadow-card"
      >
        <h2 className="mb-4 font-display text-xl text-ink">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
