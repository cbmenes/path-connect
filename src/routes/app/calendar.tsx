import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { assignJob, createJob, getJob, listJobs, setJobStatus, updateJob } from "@/lib/sweepbook/jobs";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { chargeCard, listCardsForClient } from "@/lib/sweepbook/payments";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import {
  addDaysChicago,
  chicagoDate,
  formatDate,
  formatHours,
  formatTime,
  money,
  startOfChicagoDay,
  toDatetimeLocalValue,
} from "@/lib/sweepbook/time";
import { JobForm } from "@/components/app/job-form";
import { PageHeader } from "@/components/app/empty-state";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { CardSelect } from "@/components/app/card-manager";
import { AssigneePicker, assigneeLabel } from "@/components/app/assignee-picker";
import {
  CalendarBody,
  CalendarNav,
  calendarDays,
  calendarRange,
  calendarTitle,
  isoDay,
  parseAnchor,
  readCalView,
  writeCalView,
  type CalView,
} from "@/components/app/calendar-board";
import { CancelAppointmentDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { appointmentMessageThread } from "@/lib/sweepbook/threads";
import { toast } from "sonner";

type Search = { view?: CalView; date?: string; start?: string; job?: string };

export const Route = createFileRoute("/app/calendar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: s.view === "day" || s.view === "month" || s.view === "week" ? s.view : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    start: typeof s.start === "string" ? s.start : undefined,
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const isMaster = actor.data?.kind === "cleaner";
  const isTeam = actor.data?.kind === "team";
  const [mode, setMode] = useState<CalView>(search.view ?? "month");
  const [anchor, setAnchor] = useState(() => parseAnchor(search.date));
  const [addStart, setAddStart] = useState<string | null>(search.start ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(search.job ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.job) setSelectedId(search.job);
  }, [search.job]);

  useEffect(() => {
    if (search.view) {
      setMode(search.view);
      writeCalView(search.view, "staff");
      return;
    }
    const stored = readCalView("staff");
    if (stored) setMode(stored);
  }, [search.view]);

  const range = useMemo(() => calendarRange(mode, anchor), [anchor, mode]);

  const jobs = useQuery({
    queryKey: ["jobs", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => listJobs({ data: { from: range.from.toISOString(), to: range.to.toISOString() } }),
    refetchOnMount: "always",
  });

  const days = useMemo(() => calendarDays(mode, anchor, range.from), [anchor, mode, range.from]);

  function setView(next: CalView, day?: Date) {
    const d = day ?? anchor;
    setMode(next);
    writeCalView(next, "staff");
    setAnchor(startOfChicagoDay(d));
    void navigate({
      to: "/app/calendar",
      search: { view: next, date: isoDay(d) },
      replace: true,
    });
  }

  function shift(dir: number) {
    const delta = mode === "month" ? dir * 28 : mode === "week" ? dir * 7 : dir;
    const next = addDaysChicago(anchor, delta);
    setAnchor(next);
    void navigate({ to: "/app/calendar", search: { view: mode, date: isoDay(next) }, replace: true });
  }

  if (actor.data?.kind === "client") {
    return (
      <div>
        <PageHeader title="Calendar" />
        <p className="mt-2 text-sm text-muted">
          Your visits live on the{" "}
          <Link to="/app/visits" className="text-navy underline">
            Visits
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  const title = calendarTitle(mode, anchor, range.from);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Calendar"
        action={
          isMaster ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/app/data" search={{ kind: "schedule" }}>
                  Download / Import
                </Link>
              </Button>
              <Button onClick={() => setAddStart(toDatetimeLocalValue(new Date()))}>New visit</Button>
            </div>
          ) : null
        }
      />
      <CalendarNav
        mode={mode}
        title={title}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onView={(v) => setView(v)}
        onToday={() => {
          const t = startOfChicagoDay(new Date());
          setAnchor(t);
          void navigate({ to: "/app/calendar", search: { view: mode, date: isoDay(t) }, replace: true });
        }}
      />
      <CalendarBody
        mode={mode}
        days={days}
        jobs={jobs.data ?? []}
        showPay={Boolean(isMaster)}
        showPrices={Boolean(isMaster)}
        named="client"
        canAdd={Boolean(isMaster)}
        onEmpty={(dt) => {
          if (!isMaster) return;
          setAddStart(toDatetimeLocalValue(dt));
        }}
        onJob={(j) => setSelectedId(j.id)}
      />

      <Dialog open={Boolean(addStart)} onOpenChange={(o) => !o && setAddStart(null)}>
        <DialogContent title="Add appointment" className="max-h-[90dvh] w-[min(100%-1.5rem,36rem)] overflow-y-auto">
          {addStart ? (
            <JobForm
              key={addStart}
              showAssign={isMaster}
              initial={{ startLocal: addStart, durationMin: 120, recurrence: "none" }}
              submitting={busy}
              submitLabel="Add to the book"
              onSubmit={async (input) => {
                setBusy(true);
                try {
                  const res = await createJob({ data: input });
                  toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
                  if (res.conflictCount) toast.message(`${res.conflictCount} overlap warning${res.conflictCount === 1 ? "" : "s"}.`);
                  setAddStart(null);
                  await qc.invalidateQueries({ queryKey: ["jobs"] });
                  await qc.invalidateQueries({ queryKey: ["dashboard"] });
                  if (input.startLocal) {
                    const day = fromStart(input.startLocal);
                    setAnchor(day);
                    void navigate({
                      to: "/app/calendar",
                      search: { view: mode, date: isoDay(day) },
                      replace: true,
                    });
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selectedId ? (
          <JobPanel
            id={selectedId}
            canEdit={Boolean(isMaster)}
            isTeam={Boolean(isTeam)}
            canMessage={
              actor.data?.kind === "cleaner" || (actor.data?.kind === "team" && actor.data.canMessage)
            }
            actorKind={actor.data?.kind}
            actorUserId={actor.data?.userId}
            onClose={() => setSelectedId(null)}
            onChanged={async () => {
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              await qc.invalidateQueries({ queryKey: ["job", selectedId] });
              await qc.invalidateQueries({ queryKey: ["invoices"] });
              await qc.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function fromStart(startLocal: string) {
  const [date] = startLocal.split("T");
  const [y, m, d] = date.split("-").map(Number);
  return chicagoDate(y, m, d, 0, 0);
}

function JobPanel({
  id,
  canEdit,
  isTeam,
  canMessage,
  actorKind,
  actorUserId,
  onClose,
  onChanged,
}: {
  id: string;
  canEdit: boolean;
  isTeam: boolean;
  canMessage: boolean;
  actorKind?: string;
  actorUserId?: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const q = useQuery({ queryKey: ["job", id], queryFn: () => getJob({ data: id }) });
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listAssignableStaff(), enabled: canEdit });
  const [editing, setEditing] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [cardId, setCardId] = useState("");
  const [busy, setBusy] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [assignScope, setAssignScope] = useState<"visit" | "client_recurring">("visit");
  const [cancelOpen, setCancelOpen] = useState(false);
  const cards = useQuery({
    queryKey: ["cards", q.data?.job.client_id],
    queryFn: () => listCardsForClient({ data: q.data!.job.client_id }),
    enabled: Boolean(q.data?.job.client_id) && canEdit,
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
  const selectedIds = assigneeIds ?? currentIds;

  return (
    <>
    <DialogContent title={job.client_name} className="max-h-[90dvh] w-[min(100%-1.5rem,32rem)] overflow-y-auto">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <VisitStatusBadge job={job} hideMoney={isTeam} />
          {isTeam ? null : <p className="tabular text-navy">{money(job.price_cents)}</p>}
        </div>
        <p className="text-sm">
          {formatDate(job.start_at, { weekday: "long", month: "long", day: "numeric" })} · {formatTime(job.start_at)} ·{" "}
          {formatHours(job.duration_min)}
        </p>
        <p className="text-sm text-muted">{job.address}</p>
        {job.notes ? <p className="text-sm">{job.notes}</p> : null}
        {job.assignees?.length ? (
          <p className="text-xs text-muted">Assigned to {job.assignees.map((a) => a.full_name).join(", ")}</p>
        ) : job.assignee_name ? (
          <p className="text-xs text-muted">Assigned to {job.assignee_name}</p>
        ) : null}

        {canEdit ? (
          <div className="grid gap-2 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Assigned cleaners</p>
            <AssigneePicker
              staff={staff.data ?? []}
              selected={selectedIds}
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
              size="sm"
              onClick={async () => {
                await assignJob({
                  data: { id: job.id, assignedToUserIds: selectedIds, scope: assignScope },
                });
                toast.success(assignScope === "visit" ? "This visit updated." : "Recurring jobs updated.");
                await onChanged();
              }}
            >
              Save assignees
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit"}
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
          ) : null}
          {canMessage ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/app/messages/$clientId"
              params={{
                clientId: appointmentMessageThread({
                  role: actorKind === "team" ? "team" : "cleaner",
                  teamUserId: actorUserId,
                  clientId: job.client_id,
                }),
              }}
            >
              Message
            </Link>
          </Button>
          ) : null}
          {canEdit ? (
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
        </div>

        {chargeOpen ? (
          <div className="grid gap-2 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Confirm charge</p>
            <Field label="Amount">
              <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </Field>
            <Field label="Description">
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
            <CardSelect cards={cards.data ?? []} value={cardId} onChange={setCardId} />
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await chargeCard({
                    data: {
                      clientId: job.client_id,
                      amountCents: Math.round(Number(amt) * 100),
                      description: desc,
                      jobId: job.id,
                      cardId: cardId || undefined,
                    },
                  });
                  if (res.ok) {
                    toast.success(`Paid. Receipt ${res.receiptNumber}. ${res.brand} · ${res.last4}`);
                    setChargeOpen(false);
                    await onChanged();
                  } else toast.error(res.reason);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Charge failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Charging…" : `Charge ${money(Math.round(Number(amt) * 100) || 0)}`}
            </Button>
          </div>
        ) : null}

        {editing && canEdit ? (
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
              const res = await updateJob({ data: { ...input, id: job.id } });
              toast.success(res.conflictCount ? "Saved with an overlap warning." : "Visit updated.");
              setEditing(false);
              await onChanged();
            }}
          />
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
  </>
  );
}
