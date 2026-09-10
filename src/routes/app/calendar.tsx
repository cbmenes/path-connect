import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { createJob, listJobs } from "@/lib/sweepbook/jobs";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { listTimeOff } from "@/lib/sweepbook/time-off";
import { firstName, timeOffCoversDay } from "@/lib/sweepbook/time-off-overlap";
import type { DayOffMark } from "@/components/app/calendar-board";
import {
  addDaysChicago,
  chicagoDate,
  startOfChicagoDay,
  toDatetimeLocalValue,
} from "@/lib/sweepbook/time";
import { JobForm } from "@/components/app/job-form";
import { JobPanel } from "@/components/app/job-panel";
import { PageHeader } from "@/components/app/empty-state";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const isOffice = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  const isMaster = actor.data?.kind === "cleaner";
  const isTeam = actor.data?.kind === "team";
  const canCharge = actor.data?.kind === "cleaner" || (actor.data?.kind === "admin" && actor.data.canCharge);
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
  const timeOff = useQuery({
    queryKey: ["time-off", "calendar", isoDay(range.from), isoDay(range.to)],
    queryFn: () =>
      listTimeOff({
        data: { from: isoDay(range.from), to: isoDay(addDaysChicago(range.to, -1)), upcomingOnly: false },
      }),
    enabled: isOffice || isTeam,
  });

  const days = useMemo(() => calendarDays(mode, anchor, range.from), [anchor, mode, range.from]);
  const offByDay = useMemo(() => {
    const map = new Map<string, DayOffMark[]>();
    const rows = (timeOff.data ?? []).filter((r) => r.status === "approved" || r.status === "pending");
    for (const day of days) {
      const key = isoDay(day);
      const marks: DayOffMark[] = [];
      for (const row of rows) {
        if (!timeOffCoversDay(row, key)) continue;
        if (isTeam && actor.data?.userId && row.user_id !== actor.data.userId) continue;
        marks.push({
          userId: row.user_id,
          name: row.user_name,
          status: row.status === "approved" ? "approved" : "pending",
        });
      }
      if (marks.length) map.set(key, marks);
    }
    return map;
  }, [days, timeOff.data, isTeam, actor.data?.userId]);
  const offChips = useMemo(() => {
    const seen = new Map<string, string>();
    for (const marks of offByDay.values()) {
      for (const m of marks) {
        if (m.status !== "approved") continue;
        if (!seen.has(m.userId)) seen.set(m.userId, m.name);
      }
    }
    return [...seen.entries()].map(([userId, name]) => ({ userId, name }));
  }, [offByDay]);

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
          isOffice ? (
            <div className="flex flex-wrap gap-2">
              {isMaster ? (
                <Button variant="outline" asChild>
                  <Link to="/app/data" search={{ kind: "schedule" }}>
                    Download / Import
                  </Link>
                </Button>
              ) : null}
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
      {isOffice && offChips.length ? (
        <div className="flex flex-wrap gap-1.5">
          {offChips.map((c) => (
            <span
              key={c.userId}
              className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-medium text-warn"
            >
              Off · {firstName(c.name)}
            </span>
          ))}
        </div>
      ) : null}
      <CalendarBody
        mode={mode}
        days={days}
        jobs={jobs.data ?? []}
        showPay={Boolean(isOffice)}
        showPrices={Boolean(isOffice)}
        showOverlap
        overlapForUserId={isTeam ? actor.data?.userId : undefined}
        named="client"
        canAdd={Boolean(isOffice)}
        offByDay={isOffice || isTeam ? offByDay : undefined}
        onEmpty={(dt) => {
          if (!isOffice) return;
          setAddStart(toDatetimeLocalValue(dt));
        }}
        onJob={(j) => setSelectedId(j.id)}
      />

      <Dialog open={Boolean(addStart)} onOpenChange={(o) => !o && setAddStart(null)}>
        <DialogContent title="Add appointment" className="max-h-[90dvh] w-[min(100%-1.5rem,36rem)] overflow-y-auto">
          {addStart ? (
            <JobForm
              key={addStart}
              showAssign={isOffice}
              initial={{ startLocal: addStart, durationMin: 120, recurrence: "none" }}
              submitting={busy}
              submitLabel="Add to the book"
              onSubmit={async (input) => {
                setBusy(true);
                try {
                  const res = await createJob({ data: input });
                  toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
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
            canEdit={Boolean(isOffice)}
            canCharge={Boolean(canCharge)}
            isTeam={Boolean(isTeam)}
            canMessage={
              actor.data?.kind === "cleaner" ||
              actor.data?.kind === "admin" ||
              (actor.data?.kind === "team" && actor.data.canMessage)
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
