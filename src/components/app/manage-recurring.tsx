import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelFutureRecurring, listClientSeries, saveRecurringPlan } from "@/lib/sweepbook/jobs";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import {
  chicagoDateInputValue,
  formatDate,
  fromDatetimeLocalValue,
  hoursToMinutes,
  minutesToHours,
  money,
} from "@/lib/sweepbook/time";
import type { Recurrence, RecurringPlan } from "@/lib/sweepbook/types";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function ManageRecurringDialog({
  open,
  onOpenChange,
  clientId,
  seriesId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  seriesId?: string | null;
  onChanged: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Manage recurring" className="max-h-[90dvh] w-[min(100%-1.5rem,32rem)] overflow-y-auto">
        {open && clientId ? (
          <ManageRecurringPanel
            clientId={clientId}
            seriesId={seriesId ?? undefined}
            onDone={async () => {
              onOpenChange(false);
              await onChanged();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function ManageRecurringPanel({
  clientId,
  seriesId,
  onDone,
}: {
  clientId: string;
  seriesId?: string;
  onDone?: () => Promise<void>;
}) {
  const plansQ = useQuery({
    queryKey: ["client-series", clientId, seriesId ?? "all"],
    queryFn: () => listClientSeries({ data: { clientId, seriesId } }),
  });
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listAssignableStaff() });

  if (plansQ.isPending) {
    return <div className="h-32 animate-pulse rounded-xl bg-secondary" />;
  }
  if (plansQ.error) {
    return <p className="text-sm text-danger">{(plansQ.error as Error).message}</p>;
  }
  const plans = plansQ.data ?? [];
  if (!plans.length) {
    return (
      <p className="text-sm text-muted">
        No recurring schedule on the book for this client. Add a repeating visit to start one.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      {plans.map((plan) => (
        <PlanEditor
          key={plan.seriesId}
          plan={plan}
          staff={staff.data ?? []}
          showHeading={plans.length > 1}
          onSaved={async () => {
            await plansQ.refetch();
            await onDone?.();
          }}
        />
      ))}
    </div>
  );
}

function PlanEditor({
  plan,
  staff,
  showHeading,
  onSaved,
}: {
  plan: RecurringPlan;
  staff: { user_id: string; full_name: string }[];
  showHeading: boolean;
  onSaved: () => Promise<void>;
}) {
  const [frequency, setFrequency] = useState<Recurrence>(plan.recurrence);
  const [weekday, setWeekday] = useState(plan.weekday);
  const [time, setTime] = useState(plan.time);
  const [durationHours, setDurationHours] = useState(String(minutesToHours(plan.durationMin) || 2));
  const [price, setPrice] = useState((plan.priceCents / 100).toFixed(2));
  const [assignees, setAssignees] = useState(plan.assignedToUserIds);
  const [effectiveDate, setEffectiveDate] = useState(chicagoDateInputValue());
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    setFrequency(plan.recurrence);
    setWeekday(plan.weekday);
    setTime(plan.time);
    setDurationHours(String(minutesToHours(plan.durationMin) || 2));
    setPrice((plan.priceCents / 100).toFixed(2));
    setAssignees(plan.assignedToUserIds);
  }, [plan]);

  const effectiveLabel = formatDate(fromDatetimeLocalValue(`${effectiveDate}T00:00`), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="grid gap-3">
      {showHeading ? (
        <div>
          <p className="font-display text-lg text-navy">{plan.clientName}</p>
          <p className="text-xs text-muted">
            {plan.recurrence} · {plan.weekday} {plan.time}
            {plan.futureCount ? ` · ${plan.futureCount} upcoming` : " · no upcoming visits"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {plan.futureCount
            ? `${plan.futureCount} upcoming visit${plan.futureCount === 1 ? "" : "s"} on this schedule.`
            : "No upcoming visits on this schedule."}{" "}
          Changes apply from the effective date forward. Earlier visits stay as they are.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Frequency">
          <NativeSelect value={frequency} onChange={(e) => setFrequency(e.target.value as Recurrence)}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </NativeSelect>
        </Field>
        <Field label="Weekday">
          <NativeSelect value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Duration (hours)" hint="Half-hour steps">
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Price">
        <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium text-ink">Assigned cleaners</p>
        <AssigneePicker staff={staff} selected={assignees} onChange={setAssignees} />
      </div>
      <Field label="Effective date" hint="Default is today. Visits before this date are not rewritten.">
        <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
      </Field>
      <p className="text-xs text-muted">Usual visit {money(Math.round(Number(price) * 100) || 0)}.</p>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await saveRecurringPlan({
                data: {
                  seriesId: plan.seriesId,
                  clientId: plan.clientId,
                  frequency,
                  weekday,
                  time,
                  durationMin: hoursToMinutes(Number(durationHours)),
                  priceCents: Math.round(Number(price) * 100),
                  assignedToUserIds: assignees,
                  effectiveDate,
                },
              });
              toast.success(
                res.created
                  ? `Saved. ${res.created} upcoming visit${res.created === 1 ? "" : "s"} from ${effectiveLabel}.`
                  : "Saved. Upcoming visits were updated from the effective date.",
              );
              await onSaved();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setCancelOpen(true)}>
          Cancel all future visits
        </Button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel future visits?"
        body={`Cancel all future visits on this schedule from ${effectiveLabel}?`}
        cancelLabel="Keep schedule"
        confirmLabel="Cancel future visits"
        busyLabel="Cancelling…"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            const res = await cancelFutureRecurring({
              data: { seriesId: plan.seriesId, clientId: plan.clientId, effectiveDate },
            });
            toast.message(
              res.cancelled
                ? `${res.cancelled} future visit${res.cancelled === 1 ? "" : "s"} cancelled from ${effectiveLabel}.`
                : "No upcoming visits to cancel from that date.",
            );
            setCancelOpen(false);
            await onSaved();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not cancel.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
