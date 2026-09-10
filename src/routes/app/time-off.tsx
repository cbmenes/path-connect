import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  approveTimeOff,
  cancelTimeOff,
  createTimeOff,
  denyTimeOff,
  listTimeOff,
  listTimeOffPeople,
  updateTimeOff,
  type TimeOffJobConflict,
  type TimeOffRow,
} from "@/lib/sweepbook/time-off";
import { formatTimeOffDates, isFutureOrTodayTimeOff } from "@/lib/sweepbook/time-off-overlap";
import { isOfficeActor } from "@/lib/sweepbook/types";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { ExistingJobsWarning } from "@/components/app/existing-jobs-warning";
import { TimeOffForm } from "@/components/app/time-off-form";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/app/time-off")({ component: TimeOffPage });

function statusTone(status: string): "navy" | "sage" | "danger" | "muted" {
  if (status === "pending") return "navy";
  if (status === "approved") return "sage";
  if (status === "denied") return "danger";
  return "muted";
}

function TimeOffPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const office = isOfficeActor(actor.data);
  const q = useQuery({ queryKey: ["time-off"], queryFn: () => listTimeOff({ data: { upcomingOnly: true } }) });
  const people = useQuery({ queryKey: ["time-off-people"], queryFn: () => listTimeOffPeople(), enabled: office });
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [denyTarget, setDenyTarget] = useState<TimeOffRow | null>(null);
  const [denyNote, setDenyNote] = useState("");
  const [cancelTarget, setCancelTarget] = useState<TimeOffRow | null>(null);
  const [editTarget, setEditTarget] = useState<TimeOffRow | null>(null);
  const [jobWarn, setJobWarn] = useState<{ name: string; jobs: TimeOffJobConflict[] } | null>(null);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["time-off"] });
    await qc.invalidateQueries({ queryKey: ["badges"] });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (actor.data?.kind === "client" || actor.data?.kind === "client_unlinked") {
    return <p className="text-muted">Time off is only for the cleaning team.</p>;
  }

  const rows = q.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return (
    <div className="grid gap-6">
      <PageHeader title="Time off" eyebrow={office ? "Availability" : "Your schedule"} />
      <p className="max-w-xl text-sm text-muted">
        {office
          ? "Approve requests, or add time off for a cleaner. Existing jobs stay assigned — you’ll get a list to reassign."
          : "Request a day or a stretch of days. Pending and upcoming approved time off can be cancelled."}
      </p>

      {office && pending.length ? (
        <section className="grid gap-3">
          <h2 className="font-display text-xl text-navy">Pending requests</h2>
          {pending.map((row) => (
            <Card key={row.id} className="grid gap-3">
              <OffRow row={row} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await approveTimeOff({ data: { id: row.id } });
                      toast.success("Approved.");
                      if (res.jobs.length) setJobWarn({ name: res.row.user_name, jobs: res.jobs });
                      await refresh();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not approve.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setDenyTarget(row)}>
                  Deny
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditTarget(row)}>
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <Card className="grid gap-3">
        <h2 className="font-display text-xl text-navy">{office ? "Add time off" : "Request time off"}</h2>
        <TimeOffForm
          key={office ? "office-add" : "team-add"}
          people={office ? people.data : undefined}
          submitLabel={office ? "Add time off" : "Send request"}
          busy={busy}
          onSubmit={async (value) => {
            setBusy(true);
            try {
              const res = await createTimeOff({
                data: {
                  userId: value.userId,
                  kind: value.kind,
                  startDate: value.startDate,
                  endDate: value.endDate,
                  startTime: value.startTime,
                  endTime: value.endTime,
                  note: value.note,
                },
              });
              toast.success(office ? "Time off added." : "Request sent.");
              if (res.jobs.length) setJobWarn({ name: res.row.user_name, jobs: res.jobs });
              await refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>

      <section className="grid gap-3">
        <h2 className="font-display text-xl text-navy">{office ? "Upcoming" : "Your time off"}</h2>
        {q.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : (office ? rest : rows).length === 0 ? (
          <EmptyState
            title="No upcoming time off"
            body={office ? "Add a block for a cleaner, or wait for a request." : "Request a day or a range above."}
          />
        ) : (
          <div className="grid gap-2">
            {(office ? rest : rows).map((row) => (
              <Card key={row.id} className="flex flex-wrap items-start justify-between gap-3">
                <OffRow row={row} showName={office} />
                <div className="flex flex-wrap gap-2">
                  {office && row.status !== "denied" ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(row)}>
                      Edit
                    </Button>
                  ) : null}
                  {(row.status === "pending" || (row.status === "approved" && isFutureOrTodayTimeOff(row))) ? (
                    <Button size="sm" variant="outline" onClick={() => setCancelTarget(row)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel this time off?"
        body={
          cancelTarget
            ? `Remove ${formatTimeOffDates(cancelTarget)}${office ? ` for ${cancelTarget.user_name}` : ""}?`
            : ""
        }
        cancelLabel="Keep"
        confirmLabel="Cancel time off"
        busyLabel="Cancelling…"
        busy={busy}
        onConfirm={async () => {
          if (!cancelTarget) return;
          setBusy(true);
          try {
            await cancelTimeOff({ data: { id: cancelTarget.id } });
            toast.message("Cancelled.");
            setCancelTarget(null);
            await refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not cancel.");
          } finally {
            setBusy(false);
          }
        }}
      />

      <Dialog open={Boolean(denyTarget)} onOpenChange={(o) => !o && setDenyTarget(null)}>
        <DialogContent title="Deny time off">
          <p className="text-sm text-muted">
            {denyTarget ? `${denyTarget.user_name} · ${formatTimeOffDates(denyTarget)}` : ""}
          </p>
          <Field label="Note" hint="Optional">
            <Textarea value={denyNote} onChange={(e) => setDenyNote(e.target.value)} rows={2} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDenyTarget(null)}>
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!denyTarget) return;
                setBusy(true);
                try {
                  await denyTimeOff({ data: { id: denyTarget.id, note: denyNote } });
                  toast.message("Denied.");
                  setDenyTarget(null);
                  setDenyNote("");
                  await refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not deny.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Deny
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent title="Edit time off" className="max-h-[90dvh] overflow-y-auto">
          {editTarget ? (
            <TimeOffForm
              key={editTarget.id}
              initial={{
                userId: editTarget.user_id,
                kind: editTarget.kind,
                startDate: editTarget.start_date,
                endDate: editTarget.end_date,
                startTime: editTarget.start_time ?? "09:00",
                endTime: editTarget.end_time ?? "17:00",
                note: editTarget.note ?? "",
              }}
              submitLabel="Save"
              busy={busy}
              onSubmit={async (value) => {
                setBusy(true);
                try {
                  const res = await updateTimeOff({
                    data: {
                      id: editTarget.id,
                      kind: value.kind,
                      startDate: value.startDate,
                      endDate: value.endDate,
                      startTime: value.startTime,
                      endTime: value.endTime,
                      note: value.note,
                    },
                  });
                  toast.success("Updated.");
                  setEditTarget(null);
                  if (res.jobs.length) setJobWarn({ name: res.row.user_name, jobs: res.jobs });
                  await refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not update.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ExistingJobsWarning
        open={Boolean(jobWarn)}
        jobs={jobWarn?.jobs ?? []}
        name={jobWarn?.name ?? ""}
        onClose={() => setJobWarn(null)}
      />
    </div>
  );
}

function OffRow({ row, showName = true }: { row: TimeOffRow; showName?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {showName ? <p className="font-medium">{row.user_name}</p> : null}
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      </div>
      <p className="text-sm text-muted">{formatTimeOffDates(row)}</p>
      {row.note ? <p className="text-sm">{row.note}</p> : null}
      {row.deny_note ? <p className="text-sm text-danger">Note: {row.deny_note}</p> : null}
    </div>
  );
}

