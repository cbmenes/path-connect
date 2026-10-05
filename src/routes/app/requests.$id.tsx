import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPhoneAsTyped } from "@/lib/sweepbook/people";
import { acceptCleanRequest, declineCleanRequest, getCleanRequest, serviceTypeLabel } from "@/lib/sweepbook/requests";
import { checkJobConflicts } from "@/lib/sweepbook/jobs";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import { calendarAppointmentSearch, fromDatetimeLocalValue, hoursToMinutes, minutesToHours, money } from "@/lib/sweepbook/time";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { useTimeOffHints } from "@/components/app/use-time-off-hints";
import { timeOffLine } from "@/components/app/conflict-warning";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/app/requests/$id")({ component: RequestDetailPage });

function RequestDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["clean-request", id], queryFn: () => getCleanRequest({ data: id }) });
  const staff = useQuery({ queryKey: ["assignable-staff"], queryFn: () => listAssignableStaff() });
  const [startLocal, setStartLocal] = useState("");
  const [durationHours, setDurationHours] = useState("2");
  const [priceCents, setPriceCents] = useState(15000);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [service, setService] = useState("House cleaning");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const offHints = useTimeOffHints(
    startLocal ? fromDatetimeLocalValue(startLocal) : null,
    hoursToMinutes(Number(durationHours) || 0),
  );

  useEffect(() => {
    if (!q.data) return;
    setStartLocal(q.data.defaults.startLocal);
    setDurationHours(String(minutesToHours(q.data.defaults.durationMin) || 2));
    setPriceCents(q.data.defaults.priceCents);
    setService(q.data.defaults.service);
    setNotes(q.data.request.notes || "");
    setAssignees([]);
  }, [q.data]);

  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (q.error) return <p className="text-danger">{(q.error as Error).message}</p>;
  const detail = q.data;
  if (!detail) return null;
  const r = detail.request;
  const pending = r.status === "pending";

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <PageHeader
        eyebrow="Booking request"
        title={r.name}
        action={
          <Button variant="ghost" asChild>
            <Link to="/app/requests">All requests</Link>
          </Button>
        }
      />
      <Card className="grid gap-2 p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-sage">{r.status}</p>
        <p className="text-sm">
          {serviceTypeLabel(r.service_type)}
          {r.preferred_date ? ` · ${r.preferred_date}` : ""}
          {r.preferred_time ? ` ${r.preferred_time}` : ""}
        </p>
        <p className="text-sm">{r.address}</p>
        {r.bedrooms != null || r.bathrooms != null || r.square_footage != null ? (
          <p className="text-sm text-muted">
            {[
              r.bedrooms != null ? `${r.bedrooms} bed` : null,
              r.bathrooms != null ? `${r.bathrooms} bath` : null,
              r.square_footage != null ? `${r.square_footage} sq ft` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {formatPhoneAsTyped(r.phone) || "No phone"}
          {r.email ? ` · ${r.email}` : ""}
        </p>
        {r.notes ? <p className="text-sm text-muted">{r.notes}</p> : null}
        {detail.defaults.existingClientName ? (
          <p className="text-sm text-sage">Matches existing client {detail.defaults.existingClientName}.</p>
        ) : (
          <p className="text-sm text-muted">Accepting will add them as a client.</p>
        )}
        {r.decline_note ? <p className="text-sm text-muted">Decline note: {r.decline_note}</p> : null}
        {r.job_id ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/calendar" search={calendarAppointmentSearch(r.job_id)}>
              Open appointment
            </Link>
          </Button>
        ) : null}
      </Card>

      {pending ? (
        <>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const durationMin = hoursToMinutes(Number(durationHours) || 0);
                const conflicts = await checkJobConflicts({
                  data: { startLocal, durationMin, assignedToUserIds: assignees, recurrence: "none" },
                });
                if (conflicts.conflicts.length) {
                  toast.message("A cleaner already has a visit overlapping this time. You can still accept.");
                }
                const approvedOff = (conflicts.timeOff ?? []).filter((h) => h.status === "approved");
                if (approvedOff.length) {
                  toast.message(approvedOff.map(timeOffLine).join(" ") + " Accept anyway, or pick someone else.");
                }
                const res = await acceptCleanRequest({
                  data: {
                    id: r.id,
                    startLocal,
                    durationMin,
                    priceCents,
                    assignedToUserIds: assignees,
                    service,
                    notes,
                  },
                });
                toast.success("Request accepted. One visit is on the book.");
                await qc.invalidateQueries({ queryKey: ["clean-requests"] });
                await qc.invalidateQueries({ queryKey: ["clean-request", id] });
                await qc.invalidateQueries({ queryKey: ["jobs"] });
                await qc.invalidateQueries({ queryKey: ["dashboard"] });
                await qc.invalidateQueries({ queryKey: ["notifications"] });
                await qc.invalidateQueries({ queryKey: ["badges"] });
                await navigate({ to: "/app/calendar", search: calendarAppointmentSearch(res.jobId) });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not accept.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="font-display text-xl text-navy">Accept as a visit</h2>
            <p className="text-sm text-muted">
              Edit the time, price, and assigned cleaners first. This creates one scheduled appointment — not a
              recurring series, and no card is charged.
            </p>
            <Field label="Service">
              <Input value={service} onChange={(e) => setService(e.target.value)} />
            </Field>
            <Field label="Date and time">
              <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (hours)">
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  required
                />
              </Field>
              <Field label="Price" hint={money(Number(priceCents) || 0)}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(Number(priceCents) / 100).toFixed(2)}
                  onChange={(e) => setPriceCents(Math.round(Number(e.target.value) * 100))}
                />
              </Field>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Assigned cleaners</p>
              <p className="text-xs text-muted">Leave empty if you will assign later. Nothing is auto-assigned.</p>
              <AssigneePicker staff={staff.data ?? []} selected={assignees} onChange={setAssignees} hints={offHints} />
            </div>
            <Field label="Visit notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Accept and schedule"}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setDeclineOpen(true)}>
                Decline
              </Button>
            </div>
          </form>
          <ConfirmDialog
            open={declineOpen}
            onOpenChange={setDeclineOpen}
            title="Decline this request?"
            body="The request will be marked declined. No visit will be added."
            cancelLabel="Keep request"
            confirmLabel="Decline request"
            busyLabel="Declining…"
            busy={busy}
            onConfirm={async () => {
              setBusy(true);
              try {
                await declineCleanRequest({ data: { id: r.id, note: declineNote } });
                toast.message("Request declined.");
                setDeclineOpen(false);
                await qc.invalidateQueries({ queryKey: ["clean-requests"] });
                await qc.invalidateQueries({ queryKey: ["clean-request", id] });
                await qc.invalidateQueries({ queryKey: ["dashboard"] });
                await qc.invalidateQueries({ queryKey: ["notifications"] });
                await qc.invalidateQueries({ queryKey: ["badges"] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not decline.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="mt-3">
              <Field label="Note (optional)">
                <Textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} rows={3} />
              </Field>
            </div>
          </ConfirmDialog>
        </>
      ) : null}
    </div>
  );
}
