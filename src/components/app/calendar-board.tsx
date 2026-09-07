import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
} from "@/lib/sweepbook/time";
import type { JobWithClient } from "@/lib/sweepbook/types";
import { assigneeLabel } from "@/components/app/assignee-picker";
import { TileOverlapBadge, jobOverlapTitle } from "@/components/app/overlap-mark";
import { TilePayBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { indexOverlaps, type OverlapNote } from "@/lib/sweepbook/overlaps";

export type CalView = "day" | "week" | "month";

const VIEW_KEY = "sweepbook.calView";

export function readCalView(scope = "default"): CalView | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(`${VIEW_KEY}.${scope}`);
    if (v === "day" || v === "week" || v === "month") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCalView(view: CalView, scope = "default") {
  try {
    sessionStorage.setItem(`${VIEW_KEY}.${scope}`, view);
  } catch {
    /* ignore */
  }
}

export function parseAnchor(date?: string) {
  if (!date) return startOfChicagoDay(new Date());
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return startOfChicagoDay(new Date());
  return chicagoDate(y, m, d, 0, 0);
}

export function isoDay(d: Date) {
  const p = partsInChicago(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function calendarRange(mode: CalView, anchor: Date) {
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
}

export function calendarDays(mode: CalView, anchor: Date, rangeFrom: Date) {
  const n = mode === "month" ? 42 : mode === "week" ? 7 : 1;
  const start = mode === "month" ? startOfChicagoWeek(startOfChicagoMonth(anchor)) : rangeFrom;
  return Array.from({ length: n }, (_, i) => addDaysChicago(start, i));
}

export function calendarTitle(mode: CalView, anchor: Date, rangeFrom: Date) {
  if (mode === "month") return formatDate(startOfChicagoMonth(anchor), { month: "long", year: "numeric" });
  if (mode === "week") {
    return `${formatDate(rangeFrom, { month: "long", day: "numeric" })} – ${formatDate(addDaysChicago(rangeFrom, 6), { month: "short", day: "numeric" })}`;
  }
  return formatDate(rangeFrom, { weekday: "long", month: "long", day: "numeric" });
}

function jobsOnDay(jobs: JobWithClient[], day: Date) {
  return jobs.filter((j) => sameChicagoDay(j.start_at, day));
}

function notesFor(index: Map<string, OverlapNote[]> | undefined, jobId: string) {
  return index?.get(jobId) ?? [];
}

function preferOverlapTiles(
  list: JobWithClient[],
  index: Map<string, OverlapNote[]> | undefined,
  limit: number,
) {
  if (!index || list.length <= limit) return list.slice(0, limit);
  const flagged = list.filter((j) => notesFor(index, j.id).length);
  const rest = list.filter((j) => !notesFor(index, j.id).length);
  return [...flagged, ...rest].slice(0, limit);
}

function jobTitle(job: JobWithClient, named: "client" | "service") {
  return named === "service" ? job.service : job.client_name;
}

export function CalendarNav({
  mode,
  title,
  onPrev,
  onNext,
  onView,
  onToday,
}: {
  mode: CalView;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onView: (view: CalView) => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous">
          <ChevronLeft />
        </Button>
        <p className="min-w-40 text-center font-medium">{title}</p>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next">
          <ChevronRight />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["day", "week", "month"] as CalView[]).map((v) => (
          <Button key={v} variant={mode === v ? "primary" : "outline"} size="sm" onClick={() => onView(v)}>
            {v[0].toUpperCase() + v.slice(1)}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>
    </div>
  );
}

export function WeekGrid({
  days,
  jobs,
  showPay,
  named,
  canAdd,
  onEmpty,
  onJob,
  overlapIndex,
}: {
  days: Date[];
  jobs: JobWithClient[];
  showPay: boolean;
  named: "client" | "service";
  canAdd: boolean;
  onEmpty: (dt: Date) => void;
  onJob: (j: JobWithClient) => void;
  overlapIndex?: Map<string, OverlapNote[]>;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);
  return (
    <div className="overflow-x-auto rounded-xl bg-paper shadow-card">
      <div className="grid min-w-[56rem] border-b border-border" style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
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
      <div className="relative grid min-w-[56rem]" style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div>
          {hours.map((h) => (
            <div key={h} className="h-16 border-b border-border px-2 text-xs text-muted">
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
                  onClick={() => canAdd && onEmpty(chicagoDate(p.year, p.month, p.day, h, 0))}
                  aria-label={canAdd ? `Add visit at ${h}:00` : `Visits at ${h}:00`}
                />
              );
            })}
            {jobsOnDay(jobs, d).map((j) => {
              const p = partsInChicago(j.start_at);
              const top = ((p.hour + p.minute / 60 - 7) / 13) * 100;
              const height = (j.duration_min / 60 / 13) * 100;
              const cancelled = j.status === "cancelled";
              const notes = notesFor(overlapIndex, j.id);
              return (
                <button
                  key={j.id}
                  type="button"
                  title={jobOverlapTitle(notes)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onJob(j);
                  }}
                  className={cn(
                    "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-paper",
                    cancelled ? "bg-navy/55" : "bg-navy",
                    notes.length ? "ring-2 ring-warn" : "",
                  )}
                  style={{ top: `${Math.max(0, top)}%`, height: `${Math.max(8, height)}%` }}
                >
                  <p className="truncate text-xs font-medium">{jobTitle(j, named)}</p>
                  <p className="truncate text-[10px] text-paper/70">
                    {formatTime(j.start_at)} · {formatHours(j.duration_min)}
                    {named === "client" && j.assignees?.length
                      ? ` · ${assigneeLabel(j.assignees)}`
                      : named === "client" && j.assignee_name
                        ? ` · ${j.assignee_name.split(" ")[0]}`
                        : ""}
                  </p>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1">
                    {notes.length ? <TileOverlapBadge invert /> : null}
                    {showPay ? <TilePayBadge job={j} invert /> : cancelled ? <TilePayBadge job={j} invert /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthGrid({
  days,
  jobs,
  showPay,
  named,
  canAdd,
  onEmpty,
  onJob,
  overlapIndex,
}: {
  days: Date[];
  jobs: JobWithClient[];
  showPay: boolean;
  named: "client" | "service";
  canAdd: boolean;
  onEmpty: (day: Date) => void;
  onJob: (j: JobWithClient) => void;
  overlapIndex?: Map<string, OverlapNote[]>;
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
              onClick={() => canAdd && onEmpty(d)}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 text-left align-top",
                !inMonth && "bg-secondary/40 text-muted",
                today && "bg-sage-soft",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span className={cn("text-xs font-medium", today && "text-navy")}>{partsInChicago(d).day}</span>
                {list.some((j) => notesFor(overlapIndex, j.id).length) ? (
                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wide text-warn">
                    <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden />
                    Overlap
                  </span>
                ) : null}
              </span>
              <div className="mt-1 grid gap-0.5">
                {preferOverlapTiles(list, overlapIndex, 3).map((j) => {
                  const notes = notesFor(overlapIndex, j.id);
                  return (
                  <span
                    key={j.id}
                    role="link"
                    tabIndex={0}
                    title={jobOverlapTitle(notes)}
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
                    className={cn(
                      "block rounded px-1 py-0.5 text-paper",
                      j.status === "cancelled" ? "bg-navy/55" : "bg-navy",
                      notes.length ? "ring-1 ring-warn" : "",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px]">
                        {formatTime(j.start_at)} {jobTitle(j, named)}
                      </span>
                      {notes.length ? <TileOverlapBadge compact invert /> : null}
                    </span>
                    {showPay || j.status === "cancelled" ? <TilePayBadge job={j} invert /> : null}
                  </span>
                  );
                })}
                {list.length > 3 ? <span className="text-[10px] text-muted">+{list.length - 3} more</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Agenda({
  days,
  jobs,
  showPay,
  showPrices,
  named,
  canAdd,
  onEmpty,
  onJob,
  overlapIndex,
}: {
  days: Date[];
  jobs: JobWithClient[];
  showPay: boolean;
  showPrices: boolean;
  named: "client" | "service";
  canAdd: boolean;
  onEmpty: (day: Date) => void;
  onJob: (j: JobWithClient) => void;
  overlapIndex?: Map<string, OverlapNote[]>;
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
              {canAdd ? (
                <Button variant="ghost" size="sm" onClick={() => onEmpty(d)}>
                  Add
                </Button>
              ) : null}
            </div>
            <div className="mt-2 grid gap-2">
              {list.length === 0 ? (
                canAdd ? (
                  <button type="button" className="rounded-lg border border-dashed border-border px-3 py-4 text-left text-sm text-muted" onClick={() => onEmpty(d)}>
                    No visits. Tap to add.
                  </button>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">No visits this day.</p>
                )
              ) : (
                list.map((j) => {
                  const notes = notesFor(overlapIndex, j.id);
                  return (
                  <button
                    key={j.id}
                    type="button"
                    title={jobOverlapTitle(notes)}
                    onClick={() => onJob(j)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 rounded-lg bg-paper px-3 py-3 text-left shadow-soft",
                      notes.length ? "ring-1 ring-warn" : "",
                    )}
                  >
                    <div>
                      <p className="font-medium">{jobTitle(j, named)}</p>
                      <p className="text-xs text-muted">
                        {formatTime(j.start_at)} · {formatHours(j.duration_min)}
                        {showPrices ? ` · ${money(j.price_cents)}` : ""}
                        {named === "client" && j.assignees?.length
                          ? ` · ${assigneeLabel(j.assignees)}`
                          : named === "client" && j.assignee_name
                            ? ` · ${j.assignee_name.split(" ")[0]}`
                            : ""}
                      </p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {notes.length ? <TileOverlapBadge /> : null}
                      {showPay || j.status === "cancelled" ? <TilePayBadge job={j} /> : null}
                    </span>
                  </button>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CalendarBody({
  mode,
  days,
  jobs,
  showPay,
  showPrices,
  named,
  canAdd,
  onEmpty,
  onJob,
  showOverlap = false,
  overlapForUserId,
}: {
  mode: CalView;
  days: Date[];
  jobs: JobWithClient[];
  showPay: boolean;
  showPrices: boolean;
  named: "client" | "service";
  canAdd: boolean;
  onEmpty: (dt: Date) => void;
  onJob: (j: JobWithClient) => void;
  showOverlap?: boolean;
  overlapForUserId?: string;
}) {
  const overlapIndex = useMemo(
    () => (showOverlap ? indexOverlaps(jobs, { onlyCleanerUserId: overlapForUserId }) : undefined),
    [jobs, showOverlap, overlapForUserId],
  );
  if (mode === "month") {
    return (
      <MonthGrid
        days={days}
        jobs={jobs}
        showPay={showPay}
        named={named}
        canAdd={canAdd}
        onEmpty={onEmpty}
        onJob={onJob}
        overlapIndex={overlapIndex}
      />
    );
  }
  return (
    <>
      <div className="hidden md:block">
        <WeekGrid
          days={days}
          jobs={jobs}
          showPay={showPay}
          named={named}
          canAdd={canAdd}
          onEmpty={onEmpty}
          onJob={onJob}
          overlapIndex={overlapIndex}
        />
      </div>
      <div className="md:hidden">
        <Agenda
          days={days}
          jobs={jobs}
          showPay={showPay}
          showPrices={showPrices}
          named={named}
          canAdd={canAdd}
          onEmpty={onEmpty}
          onJob={onJob}
          overlapIndex={overlapIndex}
        />
      </div>
    </>
  );
}
