import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

export type OfficeCalSearch = { view?: CalView; date?: string; start?: string; job?: string };

export function OfficeCalendar({
  clientId,
  showTimeOff = !clientId,
  named = clientId ? "service" : "client",
  variant = "page",
  showImport = true,
  viewScope = "staff",
  urlSearch,
  onUrlChange,
}: {
  clientId?: string;
  showTimeOff?: boolean;
  named?: "client" | "service";
  variant?: "page" | "embed";
  showImport?: boolean;
  viewScope?: string;
  urlSearch?: OfficeCalSearch;
  onUrlChange?: (search: OfficeCalSearch) => void;
}) {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const isOffice = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  const isMaster = actor.data?.kind === "cleaner";
  const isTeam = actor.data?.kind === "team";
  const canCharge = actor.data?.kind === "cleaner" || (actor.data?.kind === "admin" && actor.data.canCharge);
  const [mode, setMode] = useState<CalView>(urlSearch?.view ?? "month");
  const [anchor, setAnchor] = useState(() => parseAnchor(urlSearch?.date));
  const [addStart, setAddStart] = useState<string | null>(urlSearch?.start ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(urlSearch?.job ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (urlSearch?.job) setSelectedId(urlSearch.job);
  }, [urlSearch?.job]);

  useEffect(() => {
    if (urlSearch?.view) {
      setMode(urlSearch.view);
      writeCalView(urlSearch.view, viewScope);
      return;
    }
    const stored = readCalView(viewScope);
    if (stored) setMode(stored);
  }, [urlSearch?.view, viewScope]);

  const range = useMemo(() => calendarRange(mode, anchor), [anchor, mode]);

  const jobs = useQuery({
    queryKey: ["jobs", range.from.toISOString(), range.to.toISOString(), clientId ?? "all"],
    queryFn: () =>
      listJobs({
        data: { from: range.from.toISOString(), to: range.to.toISOString(), clientId },
      }),
    refetchOnMount: "always",
  });
  const timeOff = useQuery({
    queryKey: ["time-off", "calendar", isoDay(range.from), isoDay(range.to)],
    queryFn: () =>
      listTimeOff({
        data: { from: isoDay(range.from), to: isoDay(addDaysChicago(range.to, -1)), upcomingOnly: false },
      }),
    enabled: showTimeOff && (isOffice || isTeam),
  });

  const days = useMemo(() => calendarDays(mode, anchor, range.from), [anchor, mode, range.from]);
  const offByDay = useMemo(() => {
    const map = new Map<string, DayOffMark[]>();
    if (!showTimeOff) return map;
    const rows = (timeOff.data ?? []).filter((r) => r.status === "approved");
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
  }, [days, timeOff.data, isTeam, actor.data?.userId, showTimeOff]);
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

  function pushUrl(next: OfficeCalSearch) {
    onUrlChange?.(next);
  }

  function setView(next: CalView, day?: Date) {
    const d = day ?? anchor;
    setMode(next);
    writeCalView(next, viewScope);
    setAnchor(startOfChicagoDay(d));
    pushUrl({ view: next, date: isoDay(d) });
  }

  function shift(dir: number) {
    const delta = mode === "month" ? dir * 28 : mode === "week" ? dir * 7 : dir;
    const next = addDaysChicago(anchor, delta);
    setAnchor(next);
    pushUrl({ view: mode, date: isoDay(next) });
  }

  async function refreshJobs() {
    await qc.invalidateQueries({ queryKey: ["jobs"] });
    await qc.invalidateQueries({ queryKey: ["invoices"] });
    await qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (clientId) await qc.invalidateQueries({ queryKey: ["client", clientId] });
    if (selectedId) await qc.invalidateQueries({ queryKey: ["job", selectedId] });
  }

  const title = calendarTitle(mode, anchor, range.from);
  const newVisit = (
    <Button onClick={() => setAddStart(toDatetimeLocalValue(new Date()))}>New visit</Button>
  );

  return (
    <div className="grid gap-5">
      {variant === "page" ? (
        <PageHeader
          title="Calendar"
          action={
            isOffice ? (
              <div className="flex flex-wrap gap-2">
                {showImport && isMaster ? (
                  <Button variant="outline" asChild>
                    <Link to="/app/data" search={{ kind: "schedule" }}>
                      Download / Import
                    </Link>
                  </Button>
                ) : null}
                {newVisit}
              </div>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-navy">Calendar</h2>
            <p className="mt-1 text-sm text-muted">This household’s visits. Month, week, or day.</p>
          </div>
          {isOffice ? newVisit : null}
        </div>
      )}
      <CalendarNav
        mode={mode}
        title={title}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onView={(v) => setView(v)}
        onToday={() => {
          const t = startOfChicagoDay(new Date());
          setAnchor(t);
          pushUrl({ view: mode, date: isoDay(t) });
        }}
      />
      {showTimeOff && isOffice && offChips.length ? (
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
        named={named}
        canAdd={Boolean(isOffice)}
        offByDay={showTimeOff && (isOffice || isTeam) ? offByDay : undefined}
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
              key={`${addStart}-${clientId ?? ""}`}
              showAssign={isOffice}
              initial={{
                startLocal: addStart,
                durationMin: 120,
                recurrence: "none",
                clientId,
              }}
              lockClient={Boolean(clientId)}
              submitting={busy}
              submitLabel="Add to the book"
              onSubmit={async (input) => {
                setBusy(true);
                try {
                  const res = await createJob({ data: input });
                  toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
                  setAddStart(null);
                  await refreshJobs();
                  if (input.startLocal) {
                    const day = fromStart(input.startLocal);
                    setAnchor(day);
                    pushUrl({ view: mode, date: isoDay(day) });
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
            onChanged={refreshJobs}
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
