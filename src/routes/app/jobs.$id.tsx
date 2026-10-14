import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getJob, removeJob, setJobStatus, updateJob } from "@/lib/sweepbook/jobs";
import { useAssignConflictGate } from "@/components/app/conflict-warning";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { actorWritesLocked } from "@/lib/sweepbook/types";
import { chargeCard, listCardsForClient, markAsPaid, requestTip } from "@/lib/sweepbook/payments";
import { listVisitCleaners } from "@/lib/sweepbook/team";
import { appointmentMessageThread } from "@/lib/sweepbook/threads";
import { formatDateTime, formatHours, hoursUntil, money, toDatetimeLocalValue } from "@/lib/sweepbook/time";
import { AssigneePicker, plainPersonName, selectionOnStaff } from "@/components/app/assignee-picker";
import { useTimeOffHints } from "@/components/app/use-time-off-hints";
import { CancelAppointmentDialog, MarkPaidDialog, RemoveAppointmentDialog } from "@/components/app/confirm-dialog";
import { CardSelect, StripeCollectNote, defaultSavedCard, useClientChargeMode } from "@/components/app/card-manager";
import { StripeCardSetup } from "@/components/app/stripe-card-setup";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { JobForm } from "@/components/app/job-form";
import { OpenedContent } from "@/components/app/opened-content";
import { JobChecklist } from "@/components/app/job-checklist";
import { ClientJobStatus, JobProgress } from "@/components/app/job-progress";
import { ReminderTestButton } from "@/components/app/reminder-test-button";
import { OverlapDetails } from "@/components/app/overlap-mark";
import { VisitChargeLine } from "@/components/app/receipt";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { ManageRecurringDialog } from "@/components/app/manage-recurring";
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
  const [markOpen, setMarkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [assignScope, setAssignScope] = useState<"visit" | "client_recurring">("visit");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const assignGate = useAssignConflictGate();
  const isOffice = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  const writesLocked = actorWritesLocked(actor.data);
  const officeWrites = isOffice && !writesLocked;
  const canCharge =
    !writesLocked && (actor.data?.kind === "cleaner" || (actor.data?.kind === "admin" && actor.data.canCharge));
  const isTeam = actor.data?.kind === "team";
  const canMessage =
    actor.data?.kind === "cleaner" ||
    actor.data?.kind === "admin" ||
    (actor.data?.kind === "team" && actor.data.canMessage);
  const staff = useQuery({ queryKey: ["visit-cleaners"], queryFn: () => listVisitCleaners(), enabled: isOffice });
  const offHints = useTimeOffHints(jobQ.data?.job.start_at, jobQ.data?.job.duration_min);

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
        {actor.data?.kind === "client" ? <div className="mt-2"><ClientJobStatus job={job} /></div> : null}
      </div>
      <OverlapDetails notes={jobQ.data.overlaps ?? []} />
      <Card className="grid gap-2">
        <p className="text-sm text-muted">{job.address}</p>
        {isTeam ? null : <p className="tabular text-lg text-navy">{money(job.price_cents)}</p>}
        {!isTeam && job.payment_status ? (
          <VisitChargeLine
            jobStart={job.start_at}
            status={job.payment_status}
            paidAt={job.payment_paid_at}
            method={job.payment_method}
            note={job.payment_note}
            tipCents={job.tip_cents}
          />
        ) : null}
        {job.notes ? <p className="text-sm">{job.notes}</p> : null}
        {job.recurrence !== "none" ? <p className="text-xs text-muted">Repeats {job.recurrence}</p> : null}
        {job.assignees?.length ? (
          <p className="text-xs text-muted">
            Assigned to {job.assignees.map((a) => plainPersonName(a.full_name)).join(", ")}
          </p>
        ) : job.assignee_name ? (
          <p className="text-xs text-muted">Assigned to {plainPersonName(job.assignee_name)}</p>
        ) : null}
      </Card>
      {isOffice || isTeam ? (
        <JobProgress
          job={job}
          isOffice={officeWrites}
          isAssignedTeam={
            Boolean(isTeam) &&
            Boolean(actor.data?.userId) &&
            (job.assignees ?? []).some((a) => a.user_id === actor.data?.userId)
          }
          onChanged={async () => {
            await qc.invalidateQueries({ queryKey: ["job", id] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      ) : null}
      {isOffice || isTeam ? (
        <JobChecklist
          jobId={job.id}
          onChanged={async () => {
            await qc.invalidateQueries({ queryKey: ["job", id] });
          }}
        />
      ) : null}
      {officeWrites ? (
        <Card className="grid gap-3">
          <h2 className="font-display text-lg text-navy">Assigned cleaners</h2>
          <AssigneePicker
            staff={(staff.data ?? []).map((person) => ({
              ...person,
              full_name: plainPersonName(person.full_name),
            }))}
            selected={selectionOnStaff(assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id), staff.data)}
            onChange={setAssigneeIds}
            hints={offHints}
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
              const ids = selectionOnStaff(
                assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id),
                staff.data,
              );
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

      {isOffice || isTeam ? (
        <div className="flex flex-wrap gap-2">
          {officeWrites ? (
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Close editor" : "Edit"}</Button>
          ) : null}
          {job.status !== "cancelled" && officeWrites ? (
            <Button variant="ghost" onClick={() => setCancelOpen(true)}>
              Cancel appointment
            </Button>
          ) : null}
          {officeWrites ? (
            <Button variant="ghost" onClick={() => setRemoveOpen(true)}>
              Remove appointment
            </Button>
          ) : null}
          {job.series_id && officeWrites ? (
            <Button variant="outline" onClick={() => setManageOpen(true)}>
              Manage recurring
            </Button>
          ) : null}
          {canCharge ? (
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
                  } else if ("reason" in res) toast.error(res.reason);
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
          {canCharge && job.payment_status !== "paid" && job.status !== "cancelled" ? (
            <Button variant="outline" onClick={() => setMarkOpen(true)}>
              Mark as Paid
            </Button>
          ) : null}
          {canCharge && (job.payment_status === "paid" || job.status === "completed") ? (
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
                  role: isTeam ? "team" : actor.data?.kind === "admin" ? "admin" : "cleaner",
                  teamUserId: actor.data?.userId,
                  adminUserId: actor.data?.kind === "admin" ? actor.data.userId : undefined,
                  clientId: job.client_id,
                }),
              }}
            >
              Message client
            </Link>
          </Button>
          ) : null}
          {isOffice ? (
          <Button variant="ghost" asChild>
            <Link to="/app/clients/$id" params={{ id: job.client_id }}>Client profile</Link>
          </Button>
          ) : null}
          {isOffice ? <ReminderTestButton jobId={job.id} variant="ghost" /> : null}
        </div>
      ) : null}

      {editing && officeWrites ? (
        <OpenedContent>
        <JobForm
          showAssign
          initial={{
            id: job.id,
            clientId: job.client_id,
            service: job.service,
            address: job.address ?? "",
            address_line1: job.address_line1 ?? undefined,
            address_line2: job.address_line2 ?? undefined,
            city: job.city ?? undefined,
            state: job.state ?? undefined,
            zip: job.zip ?? undefined,
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
        </OpenedContent>
      ) : null}
      <CancelAppointmentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await setJobStatus({ data: { id, status: "cancelled", reason: "Cancelled by cleaner" } });
            toast.message("Visit cancelled.");
            setCancelOpen(false);
            await qc.invalidateQueries({ queryKey: ["job", id] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
          } finally {
            setBusy(false);
          }
        }}
      />
      <RemoveAppointmentDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await removeJob({ data: { id } });
            toast.message("Appointment removed.");
            setRemoveOpen(false);
            await navigate({ to: "/app/calendar" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <ManageRecurringDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        clientId={job.client_id}
        seriesId={job.series_id}
        onChanged={async () => {
          await qc.invalidateQueries({ queryKey: ["job", id] });
          await qc.invalidateQueries({ queryKey: ["jobs"] });
          await qc.invalidateQueries({ queryKey: ["client", job.client_id] });
        }}
      />
      <MarkPaidDialog
        open={markOpen}
        onOpenChange={setMarkOpen}
        busy={busy}
        onConfirm={async (note) => {
          setBusy(true);
          try {
            const res = await markAsPaid({ data: { jobId: job.id, note } });
            toast.success(`Marked as paid. Receipt ${res.receiptNumber}`);
            setMarkOpen(false);
            await qc.invalidateQueries({ queryKey: ["invoices"] });
            await qc.invalidateQueries({ queryKey: ["job", id] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not mark paid.");
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
  const qc = useQueryClient();
  const mode = useClientChargeMode();
  const local = mode.data?.mode === "demo";
  const cards = useQuery({
    queryKey: ["cards", clientId],
    queryFn: () => listCardsForClient({ data: clientId }),
    enabled: Boolean(clientId) && mode.data?.mode !== "blocked",
  });
  const saved = defaultSavedCard(cards.data ?? []);
  const cents = Math.round(Number(amt) * 100);
  return (
    <DialogContent title="Confirm charge">
      {mode.data?.mode === "blocked" ? (
        <p className="text-sm text-muted">This company cannot charge a card until Stripe setup is finished.</p>
      ) : mode.data?.mode === "stripe" && cards.data && !saved ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted">No card on file. Add one here. Charge stays in CrewWeek after the card is saved.</p>
          <StripeCardSetup
            clientId={clientId}
            source="cleaner"
            onSaved={async (card) => {
              toast.success(`Saved ${brandLabel(card.brand)} · ${card.last4}`);
              await qc.invalidateQueries({ queryKey: ["cards", clientId] });
            }}
          />
        </div>
      ) : (
      <div className="grid gap-3">
        <p className="text-sm text-muted">
          {local
            ? "Confirm the amount and description before charging the card on file."
            : "This charges the saved card on the cleaning company's Stripe account. The visit is marked paid only after Stripe confirms it."}
        </p>
        <Field label="Amount">
          <Input type="number" step="0.01" min="0.5" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </Field>
        <Field label="Description">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        {local ? <CardSelect cards={cards.data ?? []} value={cardId} onChange={setCardId} /> : <StripeCollectNote card={saved} />}
        <Button disabled={busy} onClick={() => onConfirm(cents, desc, local ? cardId || undefined : saved?.id)}>
          {busy ? "Charging…" : `Charge ${money(cents)}`}
        </Button>
      </div>
      )}
    </DialogContent>
  );
}
