import {
  addDaysChicago,
  addMinutes,
  chicagoDate,
  chicagoDateInputValue,
  formatDate,
  formatTime,
  fromDatetimeLocalValue,
} from "./time";

export type TimeOffKind = "all_day" | "range";
export type TimeOffStatus = "pending" | "approved" | "denied" | "cancelled";

export type TimeOffLite = {
  id: string;
  user_id: string;
  user_name?: string;
  kind: TimeOffKind;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: TimeOffStatus;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

export function timeOffWindow(row: TimeOffLite): { start: Date; end: Date } {
  const a = parseYmd(row.start_date);
  const b = parseYmd(row.end_date);
  if (row.kind === "all_day") {
    return {
      start: chicagoDate(a.y, a.m, a.d, 0, 0),
      end: addDaysChicago(chicagoDate(b.y, b.m, b.d, 0, 0), 1),
    };
  }
  const [sh, sm] = (row.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (row.end_time || "23:59").split(":").map(Number);
  return {
    start: chicagoDate(a.y, a.m, a.d, sh, sm),
    end: chicagoDate(b.y, b.m, b.d, eh, em),
  };
}

export function intervalsOverlap(a0: Date, a1: Date, b0: Date, b1: Date) {
  return a0 < b1 && a1 > b0;
}

export function jobOverlapsTimeOff(jobStart: Date, durationMin: number, row: TimeOffLite) {
  const jobEnd = addMinutes(jobStart, durationMin);
  const w = timeOffWindow(row);
  return intervalsOverlap(jobStart, jobEnd, w.start, w.end);
}

export function timeOffCoversDay(row: TimeOffLite, dayKey: string) {
  const d = parseYmd(dayKey);
  const dayStart = chicagoDate(d.y, d.m, d.d, 0, 0);
  const dayEnd = addDaysChicago(dayStart, 1);
  const w = timeOffWindow(row);
  return intervalsOverlap(dayStart, dayEnd, w.start, w.end);
}

export function formatTimeOffDates(row: TimeOffLite) {
  const start = fromDatetimeLocalValue(`${row.start_date}T${row.start_time || "00:00"}`);
  const end = fromDatetimeLocalValue(`${row.end_date}T${row.end_time || "00:00"}`);
  if (row.kind === "all_day") {
    if (row.start_date === row.end_date) {
      return formatDate(start, { weekday: "short", month: "short", day: "numeric" });
    }
    return `${formatDate(start, { weekday: "short", month: "short", day: "numeric" })} – ${formatDate(end, { weekday: "short", month: "short", day: "numeric" })}`;
  }
  if (row.start_date === row.end_date) {
    return `${formatDate(start, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(start)}–${formatTime(end)}`;
  }
  return `${formatDate(start, { weekday: "short", month: "short", day: "numeric" })} ${formatTime(start)} – ${formatDate(end, { weekday: "short", month: "short", day: "numeric" })} ${formatTime(end)}`;
}

export function timeOffHintForJob(
  rows: TimeOffLite[],
  userId: string,
  jobStart: Date,
  durationMin: number,
): "off" | "pending" | null {
  const mine = rows.filter((r) => r.user_id === userId && (r.status === "approved" || r.status === "pending"));
  if (mine.some((r) => r.status === "approved" && jobOverlapsTimeOff(jobStart, durationMin, r))) return "off";
  if (mine.some((r) => r.status === "pending" && jobOverlapsTimeOff(jobStart, durationMin, r))) return "pending";
  return null;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function isFutureOrTodayTimeOff(row: { end_date: string }) {
  return row.end_date >= chicagoDateInputValue();
}
