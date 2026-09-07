import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getJob, setJobStatus, updateJob } from "@/lib/sweepbook/jobs";
import { useAssignConflictGate } from "@/components/app/conflict-warning";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { chargeCard, listCardsForClient, requestTip } from "@/lib/sweepbook/payments";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import { appointmentMessageThread } from "@/lib/sweepbook/threads";
import { formatDateTime, formatHours, hoursUntil, money, toDatetimeLocalValue } from "@/lib/sweepbook/time";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { CancelAppointmentDialog } from "@/components/app/confirm-dialog";
import { CardSelect } from "@/components/app/card-manager";
import { JobForm } from "@/components/app/job-form";
import { ReminderTestButton } from "@/components/app/reminder-test-button";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";

export const Route = createFileRoute("/app/jobs/$id")({ component: JobDetail });

function JobDetail() {
  const { id } = Route.useParams();
  const jobQ = useQuery({ queryKey: ["job", id], queryFn: () => getJob({ data: id }) });
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [assignScope, setAssignScope] = useState<"visit" | "client_recurring">("visit");
  const [cancelKind, setCancelKind] = useState<"visit" | "series" | null>(null);
  const assignGate = useAssignConflictGate();
  const isCleaner = actor.data?.kind === "cleaner";
  const isTeam = actor.data?.kind === "team";
  const canMessage = actor.data?.kind === "cleaner" || (actor.data?.kind === "team" && actor.data.canMessage);
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listAssignableStaff(), enabled: isCleaner });

  if (jobQ.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (jobQ.error) return <p className="text-danger">{(jobQ.error as Error).message}</p>;
  const { job, cancellationPolicy } = jobQ.data;
  const within24 = hoursUntil(job.start_at) < 24 && hoursUntil(job.start_at) > 0;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-sage">{job.service}</p>
        <h1 className="font-display text-3xl text-navy">{job.client_name}</h1>
        <p className="mt-1 text-muted">{formatDateTime(job.start_at)} · {formatHours(job.duration_min)}</p>
        <div className="mt-2"><VisitStatusBadge job={job} hideMoney={isTeam} /></div>
      </div>
      <Card className="grid gap-2">
        <p className="text-sm text-muted">{job.address}</p>
        {isTeam ? null : <p className="tabular text-lg text-navy">{money(job.price_cents)}</p>}
        {job.notes ? <p className="text-sm">{job.notes}</p> : null}
        {job.recurrence !== "none" ? <p className="text-xs text-muted">Repeats {job.recurrence}</p> : null}
        {job.assignees?.length ? (
          <p className="text-xs text-muted">Assigned to {job.assignees.map((a) => a.full_name).join(", ")}</p>
        ) : job.assignee_name ? (
          <p className="text-xs text-muted">Assigned to {job.assignee_name}</p>
        ) : null}
      </Card>
      {isCleaner ? (
        <Card className="grid gap-3">
          <h2 className="font-display text-lg text-navy">Assigned cleaners</h2>
          <AssigneePicker
            staff={staff.data ?? []}
            selected={assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id)}
            onChange={setAssigneeIds}
          />
          <Field label="Apply assignment">
            <NativeSelect
              value={assignScope}
              onChange={(e) => setAssignScope(e.target.value as "visit" | "client_recurring")}
            >
              <option value="visit">Apply to this visit only</option>
              <option value="client_recurring">Apply to this client's recurring jobs</option>
            </NativeSelect>
          </Field>
          <Button
            variant="outline"
            disabled={assignGate.busy}
            onClick={() => {
              const ids = assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id);
              void assignGate.requestAssign({
                jobId: job.id,
                assignedToUserIds: ids,
                scope: assignScope,
                onSaved: async () => {
                  await qc.invalidateQueries({ queryKey: ["job", id] });
                  await qc.invalidateQueries({ queryKey: ["jobs"] });
                },
              });
            }}
          >
            {assignGate.busy ? "Checking…" : "Save assignees"}
          </Button>
        </Card>
      ) : null}
      {within24 && cancellationPolicy ? (
        <p className="rounded-xl bg-warn/15 p-4 text-sm text-warn">{cancellationPolicy}</p>
      ) : null}

      {isCleaner || isTeam ? (
        <div className="flex flex-wrap gap-2">
          {isCleaner ? (
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Close editor" : "Edit"}</Button>
          ) : null}
          {job.status !== "cancelled" && isCleaner ? (
            <Button variant="ghost" onClick={() => setCancelKind("visit")}>
              Cancel visit
            </Button>
          ) : null}
          {job.series_id && isCleaner && job.status !== "cancelled" ? (
            <Button variant="ghost" onClick={() => setCancelKind("series")}>
              Cancel series
            </Button>
          ) : null}
          {isCleaner ? (
          <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
            <DialogTrigger asChild>
              <Button>Charge card</Button>
            </DialogTrigger>
            <ChargeDialog
              clientId={job.client_id}
              amount={job.price_cents}
              description={`${job.service} — ${job.client_name}`}
              onConfirm={async (amountCents, description, cardId) => {
                setBusy(true);
                try {
                  const res = await chargeCard({
                    data: { clientId: job.client_id, amountCents, description, jobId: job.id, cardId },
                  });
                  if (res.ok) {
                    toast.success(`Paid. Receipt ${res.receiptNumber}. ${res.brand} · ${res.last4}`);
                    setChargeOpen(false);
                    await qc.invalidateQueries({ queryKey: ["invoices"] });
                    await qc.invalidateQueries({ queryKey: ["job", id] });
                    await qc.invalidateQueries({ queryKey: ["dashboard"] });
                  } else toast.error(res.reason);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Charge failed.");
                } finally {
                  setBusy(false);
                }
              }}
              busy={busy}
            />
          </Dialog>
          ) : null}
          {isCleaner && (job.payment_status === "paid" || job.status === "completed") ? (
            <Button
              variant="outline"
              onClick={async () => {
                await requestTip({ data: job.id });
                toast.success("Tip requested.");
              }}
            >
              Request a tip
            </Button>
          ) : null}
          {canMessage ? (
          <Button variant="ghost" asChild>
            <Link
              to="/app/messages/$clientId"
              params={{
                clientId: appointmentMessageThread({
                  role: isTeam ? "team" : "cleaner",
                  teamUserId: actor.data?.userId,
                  clientId: job.client_id,
                }),
              }}
            >
              Message client
            </Link>
          </Button>
          ) : null}
          {isCleaner ? (
          <Button variant="ghost" asChild>
            <Link to="/app/clients/$id" params={{ id: job.client_id }}>Client profile</Link>
          </Button>
          ) : null}
          {isCleaner ? <ReminderTestButton jobId={job.id} variant="ghost" /> : null}
        </div>
      ) : null}

      {editing && isCleaner ? (
        <JobForm
          showAssign
          initial={{
            id: job.id,
            clientId: job.client_id,
            service: job.service,
            address: job.address ?? "",
            startLocal: toDatetimeLocalValue(job.start_at),
            durationMin: job.duration_min,
            priceCents: job.price_cents,
            notes: job.notes ?? "",
            recurrence: "none",
            assignedToUserIds: (job.assignees ?? []).map((a) => a.user_id),
          }}
          submitLabel="Save visit"
          onSubmit={async (input) => {
            await updateJob({ data: { ...input, id: job.id } });
            toast.success("Visit updated.");
            setEditing(false);
            await qc.invalidateQueries({ queryKey: ["job", id] });
          }}
        />
      ) : null}
      <CancelAppointmentDialog
        open={Boolean(cancelKind)}
        onOpenChange={(o) => !o && setCancelKind(null)}
        series={cancelKind === "series"}
        busy={busy}
        onConfirm={async () => {
          if (!cancelKind) return;
          setBusy(true);
          try {
            if (cancelKind === "series") {
              await setJobStatus({ data: { id, status: "cancelled", series: true, reason: "Series cancelled" } });
              toast.message("This and future visits in the series were cancelled.");
              setCancelKind(null);
              await navigate({ to: "/app/calendar" });
            } else {
              await setJobStatus({ data: { id, status: "cancelled", reason: "Cancelled by cleaner" } });
              toast.message("Visit cancelled.");
              setCancelKind(null);
              await qc.invalidateQueries({ queryKey: ["job", id] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
            }
          } finally {
            setBusy(false);
          }
        }}
      />
      {assignGate.dialog}
    </div>
  );
}

function ChargeDialog({
  clientId,
  amount,
  description,
  onConfirm,
  busy,
}: {
  clientId: string;
  amount: number;
  description: string;
  onConfirm: (amount: number, description: string, cardId?: string) => void;
  busy: boolean;
}) {
  const [amt, setAmt] = useState((amount / 100).toFixed(2));
  const [desc, setDesc] = useState(description);
  const [cardId, setCardId] = useState("");
  const cards = useQuery({
    queryKey: ["cards", clientId],
    queryFn: () => listCardsForClient({ data: clientId }),
  });
  return (
    <DialogContent title="Confirm charge">
      <div className="grid gap-3">
        <p className="text-sm text-muted">Confirm the amount and description before charging the card on file.</p>
        <Field label="Amount">
          <Input type="number" step="0.01" min="0.5" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </Field>
        <Field label="Description">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <CardSelect cards={cards.data ?? []} value={cardId} onChange={setCardId} />
        <Button disabled={busy} onClick={() => onConfirm(Math.round(Number(amt) * 100), desc, cardId || undefined)}>
          {busy ? "Charging…" : `Charge ${money(Math.round(Number(amt) * 100))}`}
        </Button>
      </div>
    </DialogContent>
  );
}
