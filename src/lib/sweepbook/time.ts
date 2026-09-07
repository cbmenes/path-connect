export const TZ = "America/Chicago";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Build a Date for a civil time in America/Chicago. */
export function chicagoDate(y: number, month: number, day: number, hour = 0, minute = 0): Date {
  for (const off of ["-05:00", "-06:00"]) {
    const iso = `${y}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${off}`;
    const dt = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(dt);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    if (
      get("year") === y &&
      get("month") === month &&
      get("day") === day &&
      get("hour") === hour &&
      get("minute") === minute
    ) {
      return dt;
    }
  }
  return new Date(`${y}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-05:00`);
}

export function partsInChicago(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function chicagoDayKey(date: Date | string) {
  const p = partsInChicago(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Viewer's local civil date vs today. Used for payment badges, not Chicago display time. */
export function isOnOrBeforeLocalToday(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  const jobDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return jobDay <= today;
}

export function calendarAppointmentSearch(jobId: string, startAt?: string | null) {
  return {
    view: "day" as const,
    date: startAt ? chicagoDayKey(startAt) : undefined,
    job: jobId,
  };
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  return `${formatDate(date, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(date)}`;
}

export function toDatetimeLocalValue(date: Date | string) {
  const p = partsInChicago(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function fromDatetimeLocalValue(value: string) {
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = (time || "09:00").split(":").map(Number);
  return chicagoDate(y, m, d, h, min);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function hoursUntil(date: Date | string) {
  return ((typeof date === "string" ? new Date(date) : date).getTime() - Date.now()) / 3_600_000;
}

export function startOfChicagoDay(date: Date | string) {
  const p = partsInChicago(date);
  return chicagoDate(p.year, p.month, p.day, 0, 0);
}

export function addDaysChicago(date: Date | string, days: number) {
  const p = partsInChicago(date);
  const utc = Date.UTC(p.year, p.month - 1, p.day + days);
  const nd = new Date(utc);
  return chicagoDate(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), 0, 0);
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function nextWeekdayOnOrAfter(from: Date, weekday: string, hour: number, minute: number) {
  const want = WEEKDAY_INDEX[weekday.toLowerCase()] ?? 1;
  for (let i = 0; i < 8; i++) {
    const p = partsInChicago(addDaysChicago(from, i));
    if (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() === want) {
      return chicagoDate(p.year, p.month, p.day, hour, minute);
    }
  }
  return from;
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export function nid(prefix?: string) {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function minutesToHours(min: number) {
  return Math.round((Number(min) / 60) * 2) / 2;
}

export function hoursToMinutes(hours: number) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 60);
}

export function formatHours(min: number) {
  const h = minutesToHours(min);
  return `${Number.isInteger(h) ? String(h) : h.toFixed(1)} hr`;
}

export function sameChicagoDay(a: Date | string, b: Date | string) {
  const pa = partsInChicago(a);
  const pb = partsInChicago(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function startOfChicagoWeek(d: Date | string) {
  const start = startOfChicagoDay(d);
  const p = partsInChicago(start);
  const utc = Date.UTC(p.year, p.month - 1, p.day);
  return addDaysChicago(start, -new Date(utc).getUTCDay());
}

export function startOfChicagoMonth(d: Date | string) {
  const p = partsInChicago(d);
  return chicagoDate(p.year, p.month, 1, 0, 0);
}

export function endOfChicagoMonth(d: Date | string) {
  const p = partsInChicago(d);
  const next =
    p.month === 12 ? chicagoDate(p.year + 1, 1, 1, 0, 0) : chicagoDate(p.year, p.month + 1, 1, 0, 0);
  return addDaysChicago(next, -1);
}

export function startOfChicagoYear(d: Date | string) {
  const p = partsInChicago(d);
  return chicagoDate(p.year, 1, 1, 0, 0);
}
