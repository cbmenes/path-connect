import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { listJobs } from "@/lib/sweepbook/jobs";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import {
  addDaysChicago,
  addMinutes,
  chicagoDateInputValue,
  chicagoDayKey,
  formatDate,
  formatTime,
  fromDatetimeLocalValue,
  startOfChicagoDay,
  startOfChicagoWeek,
} from "@/lib/sweepbook/time";
import { isOfficeActor } from "@/lib/sweepbook/types";
import type { JobWithClient } from "@/lib/sweepbook/types";
import { TilePayBadge, jobTilePayLabel } from "@/components/app/status-badge";
import { TileProgressBadge } from "@/components/app/job-progress";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/sheet")({ component: SheetPage });

type Mode = "day" | "week";

function SheetPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const staff = useQuery({
    queryKey: ["assignable-staff"],
    queryFn: () => listAssignableStaff(),
    enabled: isOfficeActor(actor.data),
  });
  const [mode, setMode] = useState<Mode>("day");
  const [date, setDate] = useState(chicagoDateInputValue());
  const [cleanerId, setCleanerId] = useState("");

  const kind = actor.data?.kind;
  const isOffice = isOfficeActor(actor.data);
  const isTeam = kind === "team";
  const showPay = isOffice;

  const range = useMemo(() => {
    const selected = fromDatetimeLocalValue(`${date}T00:00`);
    if (mode === "week") {
      const from = startOfChicagoWeek(selected);
      return { from, to: addDaysChicago(from, 7) };
    }
    const from = startOfChicagoDay(selected);
    return { from, to: addDaysChicago(from, 1) };
  }, [date, mode]);

  const jobsQ = useQuery({
    queryKey: ["sheet-jobs", range.from.toISOString(), range.to.toISOString(), cleanerId, kind],
    queryFn: () =>
      listJobs({
        data: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          assignedToUserId: isOffice && cleanerId ? cleanerId : undefined,
        },
      }),
    enabled: Boolean(kind) && kind !== "client" && kind !== "none" && kind !== "client_unlinked",
  });

  if (actor.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (kind === "client" || kind === "client_unlinked" || kind === "none") {
    return <Navigate to={kind === "client" ? "/app/visits" : "/app"} />;
  }

  const jobs = (jobsQ.data ?? []).filter((j) => j.status !== "cancelled");
  const days = daysInRange(range.from, range.to);
  const byDay = new Map<string, JobWithClient[]>();
  for (const day of days) byDay.set(chicagoDayKey(day), []);
  for (const job of jobs) {
    const key = chicagoDayKey(job.start_at);
    const list = byDay.get(key);
    if (list) list.push(job);
  }

  const title =
    mode === "week"
      ? `Week of ${formatDate(range.from, { month: "short", day: "numeric" })}–${formatDate(addDaysChicago(range.to, -1), { month: "short", day: "numeric" })}`
      : formatDate(range.from, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="grid gap-5">
      <div className="print:hidden">
        <PageHeader
          eyebrow={isTeam ? "My book" : "Office"}
          title="Day sheet"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sheetAsText(title, days, byDay, showPay));
                    toast.success("Copied.");
                  } catch {
                    toast.error("Could not copy.");
                  }
                }}
              >
                Copy as text
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          }
        />
      </div>
      <div className="hidden print:block">
        <h1 className="font-display text-2xl text-navy">
          {isTeam ? "My day sheet" : "Day sheet"} — {title}
        </h1>
      </div>

      <div className="print:hidden grid gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {(["day", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm capitalize",
                mode === m ? "bg-paper text-navy shadow-soft" : "text-muted",
              )}
              onClick={() => setMode(m)}
            >
              {m === "week" && isTeam ? "My week" : m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-40 flex-1 gap-1.5">
            <span className="text-sm font-medium">Date</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDate(chicagoDateInputValue(addDaysChicago(fromDatetimeLocalValue(`${date}T00:00`), mode === "week" ? -7 : -1)))}
            >
              Prev
            </Button>
            <Button type="button" variant="outline" onClick={() => setDate(chicagoDateInputValue())}>
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDate(chicagoDateInputValue(addDaysChicago(fromDatetimeLocalValue(`${date}T00:00`), mode === "week" ? 7 : 1)))}
            >
              Next
            </Button>
          </div>
        </div>
        {isOffice ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Cleaner</span>
            <NativeSelect value={cleanerId} onChange={(e) => setCleanerId(e.target.value)}>
              <option value="">All team</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.full_name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
      </div>

      <p className="print:hidden text-sm text-muted">{title}</p>

      {jobsQ.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <div className="grid gap-5">
          {days.map((day) => {
            const key = chicagoDayKey(day);
            const rows = byDay.get(key) ?? [];
            if (mode === "day") {
              return (
                <div key={key} className="grid gap-2">
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted">No visits this day.</p>
                  ) : (
                    rows.map((job) => <SheetRow key={job.id} job={job} showPay={showPay} />)
                  )}
                </div>
              );
            }
            return (
              <section key={key} className="grid gap-2">
                <h2 className="font-display text-lg text-navy">
                  {formatDate(day, { weekday: "short", month: "short", day: "numeric" })}
                </h2>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted">No visits</p>
                ) : (
                  rows.map((job) => <SheetRow key={job.id} job={job} showPay={showPay} compact />)
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SheetRow({
  job,
  showPay,
  compact,
}: {
  job: JobWithClient;
  showPay: boolean;
  compact?: boolean;
}) {
  const end = addMinutes(new Date(job.start_at), job.duration_min);
  const cleaners = job.assignees?.length
    ? job.assignees.map((a) => a.full_name).join(", ")
    : job.assignee_name || "Unassigned";
  return (
    <Link
      to="/app/jobs/$id"
      params={{ id: job.id }}
      className={cn(
        "block rounded-xl bg-paper px-4 py-3 shadow-soft print:shadow-none print:rounded-none print:border-b print:border-border",
        compact && "py-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular text-sm font-medium text-navy">
            {formatTime(job.start_at)}–{formatTime(end)}
          </p>
          <p className="font-medium">{job.client_name}</p>
          <p className="text-sm text-muted">{job.address || "No address"}</p>
          {job.client_notes ? <p className="text-sm text-muted">{job.client_notes}</p> : null}
          <p className="text-xs text-muted">{cleaners}</p>
          <div className="mt-1">
            <TileProgressBadge job={job} />
          </div>
        </div>
        {showPay ? <TilePayBadge job={job} /> : null}
      </div>
    </Link>
  );
}

function daysInRange(from: Date, to: Date) {
  const days: Date[] = [];
  let cursor = from;
  while (cursor.getTime() < to.getTime()) {
    days.push(cursor);
    cursor = addDaysChicago(cursor, 1);
  }
  return days;
}

function sheetAsText(
  title: string,
  days: Date[],
  byDay: Map<string, JobWithClient[]>,
  showPay: boolean,
) {
  const lines = [title, ""];
  for (const day of days) {
    const key = chicagoDayKey(day);
    const rows = byDay.get(key) ?? [];
    if (days.length > 1) {
      lines.push(formatDate(day, { weekday: "long", month: "short", day: "numeric" }));
    }
    if (!rows.length) {
      lines.push("No visits");
    } else {
      for (const job of rows) {
        const end = addMinutes(new Date(job.start_at), job.duration_min);
        const cleaners = job.assignees?.length
          ? job.assignees.map((a) => a.full_name).join(", ")
          : job.assignee_name || "Unassigned";
        const pay = showPay ? jobTilePayLabel(job) : null;
        lines.push(`${formatTime(job.start_at)}–${formatTime(end)} · ${job.client_name}`);
        if (job.address) lines.push(job.address);
        if (job.client_notes) lines.push(job.client_notes);
        lines.push(cleaners);
        if (pay) lines.push(pay);
        lines.push("");
      }
    }
    if (days.length > 1) lines.push("");
  }
  return lines.join("\n").trim();
}
