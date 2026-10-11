import { storePhone } from "./people";
import { addMinutes, formatDateTime, partsInChicago } from "./time";
import type { AvailabilityWindow } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type PersonDetailsInput = {
  staffNotes?: string | null;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  birthday?: string | null;
  startDate?: string | null;
  availability?: AvailabilityWindow[];
};

export type AvailabilityHit = {
  userId: string;
  name: string;
  when: string;
  windows: string;
};

export function parseAvailabilityJson(raw: unknown): AvailabilityWindow[] {
  if (raw == null || raw === "") return [];
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: AvailabilityWindow[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const day = Number((row as { day?: unknown }).day);
    const start = String((row as { start?: unknown }).start || "");
    const end = String((row as { end?: unknown }).end || "");
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) continue;
    out.push({ day, start, end });
  }
  return out.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

export function availabilitySummary(windows: AvailabilityWindow[]) {
  if (!windows.length) return "No restriction";
  return windows.map((w) => `${DAYS[w.day]} ${formatClock(w.start)}–${formatClock(w.end)}`).join(", ");
}

export function availabilityLine(hit: AvailabilityHit) {
  return `${hit.name} is outside their weekly availability on ${hit.when}. Windows: ${hit.windows}.`;
}

export function normalizeWindows(input: AvailabilityWindow[] | undefined): AvailabilityWindow[] {
  const rows = input ?? [];
  if (rows.length > 21) throw new Error("Keep availability to 21 windows or fewer.");
  const out: AvailabilityWindow[] = [];
  for (const row of rows) {
    const day = Number(row?.day);
    const start = String(row?.start || "").slice(0, 5);
    const end = String(row?.end || "").slice(0, 5);
    if (!Number.isInteger(day) || day < 0 || day > 6) throw new Error("Pick a day for each availability window.");
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) throw new Error("Pick a start and end time for each window.");
    if (start >= end) throw new Error("Availability end time must be after the start time.");
    out.push({ day, start, end });
  }
  return out.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

export function normalizePersonDetails(input: PersonDetailsInput) {
  const windows = normalizeWindows(input.availability);
  return {
    staffNotes: clip(input.staffNotes, 2000),
    addressLine1: clip(input.addressLine1, 120) ?? "",
    addressLine2: clip(input.addressLine2, 120) ?? "",
    city: clip(input.city, 80) ?? "",
    state: (clip(input.state, 2) ?? "").toUpperCase(),
    zip: clip(input.zip, 10) ?? "",
    emergencyName: clip(input.emergencyName, 120),
    emergencyPhone: storePhone(input.emergencyPhone),
    birthday: parseIsoDate(input.birthday, "Birthday"),
    startDate: parseIsoDate(input.startDate, "Start date"),
    availabilityJson: windows.length ? JSON.stringify(windows) : null,
    windows,
  };
}

/** A visit is outside availability only when this person has at least one window. */
export function outsideAvailability(start: Date, durationMin: number, windows: AvailabilityWindow[]) {
  if (!windows.length) return false;
  const startParts = partsInChicago(start);
  const startDay = dayIndex(startParts.weekday);
  const startMin = startParts.hour * 60 + startParts.minute;
  const end = addMinutes(start, Math.max(0, durationMin));
  const endParts = partsInChicago(end);
  const endDay = dayIndex(endParts.weekday);
  const endMin = endParts.hour * 60 + endParts.minute;
  if (endDay !== startDay && endMin !== 0) return true;
  const endBound = endDay !== startDay ? 24 * 60 : endMin;
  return !windows.some((w) => {
    if (w.day !== startDay) return false;
    return startMin >= clockToMin(w.start) && endBound <= clockToMin(w.end);
  });
}

export type CrewDatePerson = {
  userId: string;
  name: string;
  birthday: string | null;
  startDate: string | null;
};

export type CrewMark = {
  userId: string;
  name: string;
  kind: "birthday" | "anniversary";
};

/** Birthday and work anniversary for a calendar day. Not a visit, and not a block. */
export function crewMarksForDay(people: CrewDatePerson[], dayKey: string): CrewMark[] {
  const marks: CrewMark[] = [];
  for (const person of people) {
    if (annualOn(person.birthday, dayKey)) {
      marks.push({ userId: person.userId, name: person.name, kind: "birthday" });
    }
    if (annualOn(person.startDate, dayKey)) {
      marks.push({ userId: `${person.userId}-start`, name: person.name, kind: "anniversary" });
    }
  }
  return marks;
}

export function crewMarkLabel(mark: CrewMark) {
  const first = mark.name.trim().split(/\s+/)[0] || mark.name;
  return mark.kind === "birthday" ? `Birthday ${first}` : `Anniversary ${first}`;
}

function annualOn(source: string | null | undefined, dayKey: string) {
  if (!source || !/^\d{4}-\d{2}-\d{2}/.test(source) || !/^\d{4}-\d{2}-\d{2}/.test(dayKey)) return false;
  const srcYear = Number(source.slice(0, 4));
  const dayYear = Number(dayKey.slice(0, 4));
  if (dayYear < srcYear) return false;
  const srcMd = monthDay(source);
  const dayMd = monthDay(dayKey);
  if (srcMd === dayMd) return true;
  if (srcMd === "02-29" && dayMd === "02-28" && !isLeap(dayYear)) return true;
  return false;
}

function monthDay(iso: string) {
  return iso.slice(5, 10);
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function parseIsoDate(raw: string | null | undefined, label: string) {
  const value = (raw || "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} needs a real date.`);
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error(`${label} needs a real date.`);
  }
  return value;
}

function clip(raw: string | null | undefined, max: number) {
  const value = (raw || "").trim();
  if (!value) return null;
  return value.slice(0, max);
}

function clockToMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function dayIndex(short: string) {
  const i = DAYS.indexOf(short as (typeof DAYS)[number]);
  return i < 0 ? 0 : i;
}

function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2020, 0, 1, h, m));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export function hitForVisit(name: string, userId: string, start: Date, windows: AvailabilityWindow[]): AvailabilityHit {
  const dayWindows = windows.filter((w) => w.day === dayIndex(partsInChicago(start).weekday));
  return {
    userId,
    name,
    when: formatDateTime(start),
    windows: dayWindows.length ? availabilitySummary(dayWindows) : "none that day",
  };
}
