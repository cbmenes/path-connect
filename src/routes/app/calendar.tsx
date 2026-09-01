import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  partsInChicago,
  sameChicagoDay,
  startOfChicagoDay,
  startOfChicagoMonth,
  startOfChicagoWeek,
  toDatetimeLocalValue,
} from "@/lib/sweepbook/time";
import { JobForm } from "@/components/app/job-form";
import { PageHeader } from "@/components/app/empty-state";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { CardSelect } from "@/components/app/card-manager";
import { AssigneePicker, assigneeLabel } from "@/components/app/assignee-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { JobWithClient } from "@/lib/sweepbook/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CalView = "day" | "week" | "month";

type Search = { view?: CalView; date?: string; start?: string };

export const Route = createFileRoute("/app/calendar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: s.view === "day" || s.view === "month" || s.view === "week" ? s.view : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    start: typeof s.start === "string" ? s.start : undefined,
  }),
  component: CalendarPage,
});

function parseAnchor(date?: string) {
  if (!date) return startOfChicagoDay(new Date());
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return startOfChicagoDay(new Date());
  return chicagoDate(y, m, d, 0, 0);
}

function isoDay(d: Date) {
  const p = partsInChicago(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const isMaster = actor.data?.kind === "cleaner";
  const isTeam = actor.data?.kind === "team";
  const [mode, setMode] = useState<CalView>(search.view ?? "week");
  const [anchor, setAnchor] = useState(() => parseAnchor(search.date));
  const [addStart, setAddStart] = useState<string | null>(search.start ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => {
    if (mode === "month") {
      const monthStart = startOfChicagoMonth(anchor);
      const gridStart = startOfChicagoWeek(monthStart);
      return { from: gridStart, to: addDaysChicago(gridStart, 42) };
    }
    if (mode === "day") {
      const from = startOfChicagoDay(anchor);
      return { from, to: addDaysChicago(from, 1) };
    }
    const from = startOfChicagoWeek(anchor);
    return { from, to: addDaysChicago(from, 7) };
  }, [anchor, mode]);

  const jobs = useQuery({
    queryKey: ["jobs", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => listJobs({ data: { from: range.from.toISOString(), to: range.to.toISOString() } }),
    refetchOnMount: "always",
  });

  const days = useMemo(() => {
    const n = mode === "month" ? 42 : mode === "week" ? 7 : 1;
    const start = mode === "month" ? startOfChicagoWeek(startOfChicagoMonth(anchor)) : range.from;
    return Array.from({ length: n }, (_, i) => addDaysChicago(start, i));
  }, [anchor, mode, range.from]);

  function setView(next: CalView, day?: Date) {
    const d = day ?? anchor;
    setMode(next);
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

  const title =
    mode === "month"
      ? formatDate(startOfChicagoMonth(anchor), { month: "long", year: "numeric" })
      : mode === "week"
        ? `${formatDate(range.from, { month: "long", day: "numeric" })} – ${formatDate(addDaysChicago(range.from, 6), { month: "short", day: "numeric" })}`
        : formatDate(range.from, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Calendar"
        action={
          isMaster ? (
            <Button onClick={() => setAddStart(toDatetimeLocalValue(new Date()))}>New visit</Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <p className="min-w-40 text-center font-medium">{title}</p>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <Button key={v} variant={mode === v ? "primary" : "outline"} size="sm" onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const t = startOfChicagoDay(new Date());
              setAnchor(t);
              void navigate({ to: "/app/calendar", search: { view: mode, date: isoDay(t) }, replace: true });
            }}
          >
            Today
          </Button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid
          days={days}
          jobs={jobs.data ?? []}
          onEmpty={(day) => {
            if (!isMaster) return;
            const p = partsInChicago(day);
            setAddStart(toDatetimeLocalValue(chicagoDate(p.year, p.month, p.day, 9, 0)));
          }}
          onJob={(j) => setSelectedId(j.id)}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <WeekGrid
              days={days}
              jobs={jobs.data ?? []}
              onEmpty={(dt) => {
                if (!isMaster) return;
                setAddStart(toDatetimeLocalValue(dt));
              }}
              onJob={(j) => setSelectedId(j.id)}
            />
          </div>
          <div className="md:hidden">
            <Agenda
              days={days}
              jobs={jobs.data ?? []}
              hideMoney={Boolean(isTeam)}
              onEmpty={(day) => {
                if (!isMaster) return;
                const p = partsInChicago(day);
                setAddStart(toDatetimeLocalValue(chicagoDate(p.year, p.month, p.day, 9, 0)));
              }}
              onJob={(j) => setSelectedId(j.id)}
            />
          </div>
        </>
      )}

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

function jobsOnDay(jobs: JobWithClient[], day: Date) {
  return jobs.filter((j) => j.status !== "cancelled" && sameChicagoDay(j.start_at, day));
}

function WeekGrid({
  days,
  jobs,
  onEmpty,
  onJob,
}: {
  days: Date[];
  jobs: JobWithClient[];
  onEmpty: (dt: Date) => void;
  onJob: (j: JobWithClient) => void;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);
  return (
    <div className="overflow-x-auto rounded-xl bg-paper shadow-card">
      <div className="grid min-w-[56rem] grid-cols-8 border-b border-border">
        <div className="p-2 text-xs text-muted" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn("p-2 text-center text-xs font-medium text-navy", sameChicagoDay(d, new Date()) && "bg-sage-soft")}
          >
            {formatDate(d, { weekday: "short" })}
            <div className="text-lg tabular-nums">{partsInChicago(d).day}</div>
          </div>
        ))}
      </div>
      <div className="relative grid min-w-[56rem] grid-cols-8">
        <div>
          {hours.map((h) => (
            <div key={h} className="h-16 border-b border-border px-2 text-[11px] text-muted">
              {h > 12 ? h - 12 : h}
              {h >= 12 ? "pm" : "am"}
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d.toISOString()} className="relative border-l border-border">
            {hours.map((h) => {
              const p = partsInChicago(d);
              return (
                <button
                  key={h}
                  type="button"
                  className="h-16 w-full border-b border-border/80 hover:bg-sage-soft/50"
                  onClick={() => onEmpty(chicagoDate(p.year, p.month, p.day, h, 0))}
                  aria-label={`Add visit at ${h}:00`}
                />
              );
            })}
            {jobsOnDay(jobs, d).map((j) => {
              const p = partsInChicago(j.start_at);
              const top = ((p.hour + p.minute / 60 - 7) / 13) * 100;
              const height = (j.duration_min / 60 / 13) * 100;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJob(j);
                  }}
                  className="absolute inset-x-1 overflow-hidden rounded-md bg-navy px-1.5 py-1 text-left text-paper"
                  style={{ top: `${Math.max(0, top)}%`, height: `${Math.max(8, height)}%` }}
                >
                  <p className="truncate text-[11px] font-medium">{j.client_name}</p>
                  <p className="truncate text-[10px] text-paper/70">
                    {formatTime(j.start_at)} · {formatHours(j.duration_min)}
                    {j.assignees?.length ? ` · ${assigneeLabel(j.assignees)}` : j.assignee_name ? ` · ${j.assignee_name.split(" ")[0]}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  days,
  jobs,
  onEmpty,
  onJob,
}: {
  days: Date[];
  jobs: JobWithClient[];
  onEmpty: (day: Date) => void;
  onJob: (j: JobWithClient) => void;
}) {
  const month = partsInChicago(days[15] ?? days[0]).month;
  return (
    <div className="overflow-hidden rounded-xl bg-paper shadow-card">
      <div className="grid grid-cols-7 border-b border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = jobsOnDay(jobs, d);
          const inMonth = partsInChicago(d).month === month;
          const today = sameChicagoDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onEmpty(d)}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 text-left align-top",
                !inMonth && "bg-secondary/40 text-muted",
                today && "bg-sage-soft",
              )}
            >
              <span className={cn("text-xs font-medium", today && "text-navy")}>{partsInChicago(d).day}</span>
              <div className="mt-1 grid gap-0.5">
                {list.slice(0, 3).map((j) => (
                  <span
                    key={j.id}
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onJob(j);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onJob(j);
                      }
                    }}
                    className="block truncate rounded bg-navy px-1 py-0.5 text-[10px] text-paper"
                  >
                    {formatTime(j.start_at)} {j.client_name}
                    {j.assignees?.length ? ` ${assigneeLabel(j.assignees)}` : ""}
                  </span>
                ))}
                {list.length > 3 ? <span className="text-[10px] text-muted">+{list.length - 3} more</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({
  days,
  jobs,
  hideMoney,
  onEmpty,
  onJob,
}: {
  days: Date[];
  jobs: JobWithClient[];
  hideMoney?: boolean;
  onEmpty: (day: Date) => void;
  onJob: (j: JobWithClient) => void;
}) {
  return (
    <div className="grid gap-4">
      {days.map((d) => {
        const list = jobsOnDay(jobs, d);
        return (
          <section key={d.toISOString()}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-sm font-medium text-navy", sameChicagoDay(d, new Date()) && "text-sage")}>
                {formatDate(d, { weekday: "long", month: "short", day: "numeric" })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEmpty(d)}>
                Add
              </Button>
            </div>
            <div className="mt-2 grid gap-2">
              {list.length === 0 ? (
                <button type="button" className="rounded-lg border border-dashed border-border px-3 py-4 text-left text-sm text-muted" onClick={() => onEmpty(d)}>
                  No visits. Tap to add.
                </button>
              ) : (
                list.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onJob(j)}
                    className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 text-left shadow-soft"
                  >
                    <div>
                      <p className="font-medium">{j.client_name}</p>
                      <p className="text-xs text-muted">
                        {formatTime(j.start_at)} · {formatHours(j.duration_min)}
                        {hideMoney ? "" : ` · ${money(j.price_cents)}`}
                        {j.assignees?.length ? ` · ${assigneeLabel(j.assignees)}` : j.assignee_name ? ` · ${j.assignee_name.split(" ")[0]}` : ""}
                      </p>
                    </div>
                    <VisitStatusBadge job={j} hideMoney={hideMoney} />
                  </button>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function JobPanel({
  id,
  canEdit,
  isTeam,
  canMessage,
  onClose,
  onChanged,
}: {
  id: string;
  canEdit: boolean;
  isTeam: boolean;
  canMessage: boolean;
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
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await setJobStatus({ data: { id: job.id, status: "cancelled", reason: "Cancelled by cleaner" } });
                toast.message("Visit cancelled.");
                await onChanged();
                onClose();
              }}
            >
              Cancel
            </Button>
          ) : null}
          {canMessage ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/messages/$clientId" params={{ clientId: job.client_id }}>
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
  );
}
