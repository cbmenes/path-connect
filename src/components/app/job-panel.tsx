import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getJob, removeJob, setJobStatus, updateJob } from "@/lib/sweepbook/jobs";
import { useAssignConflictGate } from "@/components/app/conflict-warning";
import { chargeCard, listCardsForClient, markAsPaid } from "@/lib/sweepbook/payments";
import { listVisitCleaners } from "@/lib/sweepbook/team";
import { formatDate, formatHours, formatTime, money, toDatetimeLocalValue } from "@/lib/sweepbook/time";
import { JobForm } from "@/components/app/job-form";
import { OpenedContent } from "@/components/app/opened-content";
import { JobChecklist } from "@/components/app/job-checklist";
import { JobProgress } from "@/components/app/job-progress";
import { OverlapDetails } from "@/components/app/overlap-mark";
import { VisitChargeLine } from "@/components/app/receipt";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { CardSelect, StripeCollectNote, defaultSavedCard, useClientChargeMode } from "@/components/app/card-manager";
import { StripeCardSetup } from "@/components/app/stripe-card-setup";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { AssigneePicker, plainPersonName, selectionOnStaff } from "@/components/app/assignee-picker";
import { useTimeOffHints } from "@/components/app/use-time-off-hints";
import { CancelAppointmentDialog, MarkPaidDialog, RemoveAppointmentDialog } from "@/components/app/confirm-dialog";
import { ManageRecurringDialog } from "@/components/app/manage-recurring";
import { ReminderTestButton } from "@/components/app/reminder-test-button";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { appointmentMessageThread } from "@/lib/sweepbook/threads";

export function JobPanel({
  id,
  canEdit,
  canCharge = canEdit,
  isTeam,
  canMessage,
  actorKind,
  actorUserId,
  onClose,
  onChanged,
}: {
  id: string;
  canEdit: boolean;
  canCharge?: boolean;
  isTeam: boolean;
  canMessage: boolean;
  actorKind?: string;
  actorUserId?: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const q = useQuery({ queryKey: ["job", id], queryFn: () => getJob({ data: id }) });
  const staff = useQuery({ queryKey: ["visit-cleaners"], queryFn: () => listVisitCleaners(), enabled: canEdit });
  const [editing, setEditing] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [cardId, setCardId] = useState("");
  const [busy, setBusy] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [assignScope, setAssignScope] = useState<"visit" | "client_recurring">("visit");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const assignGate = useAssignConflictGate();
  const offHints = useTimeOffHints(q.data?.job.start_at, q.data?.job.duration_min);
  const mode = useClientChargeMode();
  const localCards = mode.data?.mode === "demo";
  const cards = useQuery({
    queryKey: ["cards", q.data?.job.client_id],
    queryFn: () => listCardsForClient({ data: q.data!.job.client_id }),
    enabled: Boolean(q.data?.job.client_id) && canCharge && mode.data?.mode !== "blocked",
  });

  if (q.isPending) {
    return (
      <DialogContent title="Visit">
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      </DialogContent>
    );
  }
  if (q.error || !q.data) {
    return (
      <DialogContent title="Visit">
        <p className="text-danger">{(q.error as Error)?.message || "Not found."}</p>
      </DialogContent>
    );
  }
  const { job } = q.data;

  const currentIds = (job.assignees ?? []).map((a) => a.user_id);
  const selectedIds = selectionOnStaff(assigneeIds ?? currentIds, staff.data);

  return (
    <>
    <DialogContent title={job.client_name} className="max-h-[90dvh] w-[min(100%-1.5rem,32rem)] overflow-y-auto">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <VisitStatusBadge job={job} hideMoney={isTeam} />
          {isTeam ? null : <p className="tabular text-navy">{money(job.price_cents)}</p>}
        </div>
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
        <OverlapDetails notes={q.data.overlaps ?? []} />
        <p className="text-sm">
          {formatDate(job.start_at, { weekday: "long", month: "long", day: "numeric" })} · {formatTime(job.start_at)} ·{" "}
          {formatHours(job.duration_min)}
        </p>
        <p className="text-sm text-muted">{job.address}</p>
        {job.notes ? <p className="text-sm">{job.notes}</p> : null}
        {job.assignees?.length ? (
          <p className="text-xs text-muted">
            Assigned to {job.assignees.map((a) => plainPersonName(a.full_name)).join(", ")}
          </p>
        ) : job.assignee_name ? (
          <p className="text-xs text-muted">Assigned to {plainPersonName(job.assignee_name)}</p>
        ) : null}

        {(canEdit || isTeam) && job.status !== "cancelled" ? (
          <JobProgress
            job={job}
            isOffice={canEdit}
            isAssignedTeam={
              isTeam &&
              Boolean(
                actorUserId &&
                  (job.assignees ?? []).some((a) => a.user_id === actorUserId),
              )
            }
            onChanged={async () => {
              await q.refetch();
              await onChanged();
            }}
          />
        ) : null}
        {(canEdit || isTeam) && job.status !== "cancelled" ? (
          <JobChecklist
            jobId={job.id}
            onChanged={async () => {
              await q.refetch();
              await onChanged();
            }}
          />
        ) : null}

        {canEdit ? (
          <div className="grid gap-2 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Assigned cleaners</p>
            <AssigneePicker
              staff={(staff.data ?? []).map((person) => ({
                ...person,
                full_name: plainPersonName(person.full_name),
              }))}
              selected={selectedIds}
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
              size="sm"
              disabled={assignGate.busy}
              onClick={() => {
                void assignGate.requestAssign({
                  jobId: job.id,
                  assignedToUserIds: selectedIds,
                  scope: assignScope,
                  onSaved: onChanged,
                });
              }}
            >
              {assignGate.busy ? "Checking…" : "Save assignees"}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit"}
            </Button>
          ) : null}
          {canEdit && job.series_id ? (
            <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
              Manage recurring
            </Button>
          ) : null}
          {canEdit && job.status !== "cancelled" ? (
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
              Cancel appointment
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setRemoveOpen(true)}>
              Remove appointment
            </Button>
          ) : null}
          {canMessage ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/app/messages/$clientId"
              params={{
                clientId: appointmentMessageThread({
                  role: actorKind === "team" ? "team" : actorKind === "admin" ? "admin" : "cleaner",
                  teamUserId: actorUserId,
                  adminUserId: actorKind === "admin" ? actorUserId : undefined,
                  clientId: job.client_id,
                }),
              }}
            >
              Message
            </Link>
          </Button>
          ) : null}
          {canCharge ? (
            <Button
              size="sm"
              onClick={() => {
                setAmt((job.price_cents / 100).toFixed(2));
                setDesc(`${job.service} — ${job.client_name}`);
                setChargeOpen(true);
              }}
            >
              Charge / collect
            </Button>
          ) : null}
          {canCharge && job.payment_status !== "paid" && job.status !== "cancelled" ? (
            <Button variant="outline" size="sm" onClick={() => setMarkOpen(true)}>
              Mark as Paid
            </Button>
          ) : null}
          {canEdit ? <ReminderTestButton jobId={job.id} size="sm" /> : null}
        </div>

        {chargeOpen && canCharge ? (
          <OpenedContent>
          <div className="grid gap-2 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Confirm charge</p>
            <Field label="Amount">
              <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </Field>
            <Field label="Description">
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
            {mode.data?.mode === "blocked" ? (
              <p className="text-sm text-muted">This company cannot charge a card until Stripe setup is finished.</p>
            ) : mode.data?.mode === "stripe" && cards.data && !defaultSavedCard(cards.data) ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted">No card on file. Add one here. Charge stays in CrewWeek after the card is saved.</p>
                <StripeCardSetup
                  clientId={job.client_id}
                  source="cleaner"
                  onSaved={async (card) => {
                    toast.success(`Saved ${brandLabel(card.brand)} · ${card.last4}`);
                    await cards.refetch();
                  }}
                />
              </div>
            ) : (
            <>
            {localCards ? <CardSelect cards={cards.data ?? []} value={cardId} onChange={setCardId} /> : <StripeCollectNote card={defaultSavedCard(cards.data ?? [])} />}
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const saved = defaultSavedCard(cards.data ?? []);
                  const res = await chargeCard({
                    data: {
                      clientId: job.client_id,
                      amountCents: Math.round(Number(amt) * 100),
                      description: desc,
                      jobId: job.id,
                      cardId: localCards ? cardId || undefined : saved?.id,
                    },
                  });
                  if (res.ok) {
                    toast.success(`Paid. Receipt ${res.receiptNumber}. ${res.brand} · ${res.last4}`);
                    setChargeOpen(false);
                    await onChanged();
                  } else if ("reason" in res) toast.error(res.reason);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Charge failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Charging…" : `Charge ${money(Math.round(Number(amt) * 100) || 0)}`}
            </Button>
            </>
            )}
          </div>
          </OpenedContent>
        ) : null}

        {editing && canEdit ? (
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
              await onChanged();
            }}
          />
          </OpenedContent>
        ) : null}
      </div>
    </DialogContent>
    <CancelAppointmentDialog
      open={cancelOpen}
      onOpenChange={setCancelOpen}
      busy={busy}
      onConfirm={async () => {
        setBusy(true);
        try {
          await setJobStatus({ data: { id: job.id, status: "cancelled", reason: "Cancelled by cleaner" } });
          toast.message("Visit cancelled.");
          setCancelOpen(false);
          await onChanged();
          onClose();
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
          await removeJob({ data: { id: job.id } });
          toast.message("Appointment removed.");
          setRemoveOpen(false);
          await onChanged();
          onClose();
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
      onChanged={onChanged}
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
          await onChanged();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not mark paid.");
        } finally {
          setBusy(false);
        }
      }}
    />
    {assignGate.dialog}
  </>
  );
}
