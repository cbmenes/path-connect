import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getDashboard, isClientDash } from "@/lib/sweepbook/dashboard";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { clientCancelOrReschedule, getJob, listJobs } from "@/lib/sweepbook/jobs";
import { addDaysChicago, formatDateTime, formatHours, hoursUntil, money, startOfChicagoDay } from "@/lib/sweepbook/time";
import {
  CalendarBody,
  CalendarNav,
  calendarDays,
  calendarRange,
  calendarTitle,
  parseAnchor,
  readCalView,
  writeCalView,
  type CalView,
} from "@/components/app/calendar-board";
import { VisitChargeLine } from "@/components/app/receipt";
import { TilePayBadge, VisitStatusBadge } from "@/components/app/status-badge";
import { ClientJobStatus } from "@/components/app/job-progress";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import type { JobWithClient } from "@/lib/sweepbook/types";

export const Route = createFileRoute("/app/visits")({ component: VisitsPage });

function VisitsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const qc = useQueryClient();
  const upcoming = q.data && isClientDash(q.data) ? q.data.upcoming : [];
  const past = q.data && isClientDash(q.data) ? q.data.past : [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<CalView>("month");
  const [anchor, setAnchor] = useState(() => parseAnchor());
  const [selected, setSelected] = useState<JobWithClient | null>(null);
  const jobMeta = useQuery({
    queryKey: ["job", activeId],
    queryFn: () => getJob({ data: activeId! }),
    enabled: Boolean(activeId),
  });

  useEffect(() => {
    const stored = readCalView("client");
    if (stored) setMode(stored);
  }, []);

  const range = useMemo(() => calendarRange(mode, anchor), [anchor, mode]);
  const days = useMemo(() => calendarDays(mode, anchor, range.from), [anchor, mode, range.from]);
  const jobs = useQuery({
    queryKey: ["jobs", "client-visits", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => listJobs({ data: { from: range.from.toISOString(), to: range.to.toISOString() } }),
    enabled: actor.data?.kind === "client",
    refetchOnMount: "always",
  });

  function setView(next: CalView) {
    setMode(next);
    writeCalView(next, "client");
  }

  function shift(dir: number) {
    const delta = mode === "month" ? dir * 28 : mode === "week" ? dir * 7 : dir;
    setAnchor(addDaysChicago(anchor, delta));
  }

  function openCancel(id: string) {
    setSelected(null);
    setActiveId(id);
    setNote("");
  }

  if (actor.data && actor.data.kind !== "client") {
    return <Navigate to="/app/calendar" />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Your visits" />
      <CalendarNav
        mode={mode}
        title={calendarTitle(mode, anchor, range.from)}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onView={setView}
        onToday={() => setAnchor(startOfChicagoDay(new Date()))}
      />
      <CalendarBody
        mode={mode}
        days={days}
        jobs={jobs.data ?? []}
        showPay
        showPrices
        showOverlap={false}
        named="service"
        canAdd={false}
        onEmpty={() => undefined}
        onJob={setSelected}
      />

      <section>
        <h2 className="font-display text-xl text-navy">Upcoming</h2>
        <div className="mt-3 grid gap-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled.</p>
          ) : (
            upcoming.map((j) => {
              const soon = hoursUntil(j.start_at) < 24;
              return (
                <Card key={j.id} className="grid gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatDateTime(j.start_at)}</p>
                      <p className="text-sm text-muted">
                        {formatHours(j.duration_min)} · {money(j.price_cents)}
                      </p>
                      {j.payment_status ? (
                        <VisitChargeLine
                          jobStart={j.start_at}
                          status={j.payment_status}
                          paidAt={j.payment_paid_at}
                          method={j.payment_method}
                          note={j.payment_note}
                          tipCents={j.tip_cents}
                        />
                      ) : null}
                      <p className="text-xs text-muted">{j.address}</p>
                      <ClientJobStatus job={j} />
                    </div>
                    <VisitStatusBadge job={j} />
                  </div>
                  {soon ? <p className="text-xs text-warn">Inside 24 hours — the cancellation policy applies.</p> : null}
                  {j.status === "scheduled" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openCancel(j.id)}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl text-navy">Past</h2>
        <div className="mt-3 grid gap-2">
          {past.map((j) => (
            <Card key={j.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{formatDateTime(j.start_at)}</p>
                <p className="text-xs text-muted">{money(j.price_cents)}</p>
                {j.payment_status ? (
                  <VisitChargeLine
                    jobStart={j.start_at}
                    status={j.payment_status}
                    paidAt={j.payment_paid_at}
                    method={j.payment_method}
                    note={j.payment_note}
                    tipCents={j.tip_cents}
                  />
                ) : null}
              </div>
              <VisitStatusBadge job={j} />
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        {selected ? (
          <DialogContent title={selected.service}>
            <p className="text-sm text-muted">{formatDateTime(selected.start_at)}</p>
            <p className="text-sm text-muted">{selected.address}</p>
            <div className="mt-2 grid gap-2">
              <TilePayBadge job={selected} />
              {selected.payment_status ? (
                <VisitChargeLine
                  jobStart={selected.start_at}
                  status={selected.payment_status}
                  paidAt={selected.payment_paid_at}
                  method={selected.payment_method}
                  note={selected.payment_note}
                  tipCents={selected.tip_cents}
                />
              ) : null}
              <ClientJobStatus job={selected} />
            </div>
            {selected.status === "scheduled" && hoursUntil(selected.start_at) > 0 ? (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => openCancel(selected.id)}>
                  Cancel
                </Button>
              </div>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(activeId)} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent title="Are you sure you want to cancel this appointment?">
          {jobMeta.data?.cancellationPolicy?.trim() ? (
            <div className="mb-3">
              <p className="text-sm font-medium text-ink">Cancellation policy</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{jobMeta.data.cancellationPolicy.trim()}</p>
            </div>
          ) : null}
          <p className="mb-3 text-sm text-muted">Your cleaner will be notified. You can ask them to book a new time.</p>
          <Field label="Note for your cleaner">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setActiveId(null)}>
              Keep appointment
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!activeId) return;
                setBusy(true);
                try {
                  const res = await clientCancelOrReschedule({
                    data: { id: activeId, action: "cancel", note },
                  });
                  toast.success("Visit cancelled. Your cleaner was notified.");
                  if (res.within24) toast.message("This visit was inside 24 hours.");
                  setActiveId(null);
                  await qc.invalidateQueries({ queryKey: ["dashboard"] });
                  await qc.invalidateQueries({ queryKey: ["jobs"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not cancel.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Cancelling…" : "Cancel appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
