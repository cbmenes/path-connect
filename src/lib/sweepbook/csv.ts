export type CsvKind = "clients" | "team" | "schedule";
export type ImportMode = "add" | "replace";

export const CLIENT_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "notes",
  "default_price",
  "default_duration_hours",
  "frequency",
  "preferred_weekday",
  "preferred_time",
  "assigned_cleaner_emails",
] as const;

export const TEAM_FIELDS = ["name", "phone", "email", "messaging_enabled"] as const;

export const SCHEDULE_FIELDS = [
  "client_email",
  "date",
  "time",
  "duration_hours",
  "price",
  "assigned_cleaner_emails",
  "notes",
  "status",
] as const;

export type ClientField = (typeof CLIENT_FIELDS)[number];
export type TeamField = (typeof TEAM_FIELDS)[number];
export type ScheduleField = (typeof SCHEDULE_FIELDS)[number];
export type TemplateField = ClientField | TeamField | ScheduleField;

export const TEMPLATE_FIELDS: Record<CsvKind, readonly string[]> = {
  clients: CLIENT_FIELDS,
  team: TEAM_FIELDS,
  schedule: SCHEDULE_FIELDS,
};

export const REQUIRED_FIELDS: Record<CsvKind, readonly string[]> = {
  clients: ["name"],
  team: ["name"],
  schedule: ["client_email", "date", "time"],
};

const ALIASES: Record<string, string[]> = {
  name: ["full_name", "client_name", "cleaner_name"],
  phone: ["phone_number", "mobile"],
  email: ["e_mail", "client_email"],
  address: ["street", "street_address"],
  notes: ["note", "comments"],
  default_price: ["price", "usual_price", "rate"],
  default_duration_hours: ["duration", "duration_hours", "hours"],
  frequency: ["freq", "repeat"],
  preferred_weekday: ["usual_day", "weekday", "day"],
  preferred_time: ["usual_time", "start_time"],
  assigned_cleaner_emails: ["assigned", "cleaners", "assignees", "team"],
  messaging_enabled: ["can_message", "messaging"],
  client_email: ["email", "customer_email"],
  date: ["day", "visit_date", "start_date"],
  time: ["start", "start_time"],
  duration_hours: ["duration", "hours"],
  price: ["amount", "default_price"],
  status: ["job_status", "payment_status"],
};

export function normalizeHeader(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsvText(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][] };
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows = lines.slice(1).filter((l) => l.trim()).map(splitCsvLine);
  return { headers, rows };
}

export function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function toCsv(headers: readonly string[], rows: Array<Record<string, string | number | null | undefined>>) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(String(row[h] ?? ""))).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function blankTemplate(kind: CsvKind) {
  return `${TEMPLATE_FIELDS[kind].join(",")}\n`;
}

export function guessMapping(kind: CsvKind, uploaded: string[]) {
  const fields = TEMPLATE_FIELDS[kind];
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of fields) {
    const exact = uploaded.find((h) => h === field);
    if (exact && !used.has(exact)) {
      mapping[field] = exact;
      used.add(exact);
      continue;
    }
    const alias = (ALIASES[field] ?? []).find((a) => uploaded.includes(a) && !used.has(a));
    if (alias) {
      mapping[field] = alias;
      used.add(alias);
    } else {
      mapping[field] = "";
    }
  }
  return mapping;
}

export function headersMatchTemplate(kind: CsvKind, uploaded: string[]) {
  const fields = TEMPLATE_FIELDS[kind];
  if (uploaded.length !== fields.length) return false;
  return fields.every((f, i) => uploaded[i] === f);
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>,
  fields: readonly string[],
) {
  const index = new Map(headers.map((h, i) => [h, i]));
  return rows.map((cols) => {
    const row: Record<string, string> = {};
    for (const field of fields) {
      const src = mapping[field];
      const idx = src ? index.get(src) : undefined;
      row[field] = idx == null ? "" : (cols[idx] ?? "").trim();
    }
    return row;
  });
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WEEK_IN: Record<string, string> = {
  mon: "monday",
  monday: "monday",
  tue: "tuesday",
  tues: "tuesday",
  tuesday: "tuesday",
  wed: "wednesday",
  wednesday: "wednesday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  thursday: "thursday",
  fri: "friday",
  friday: "friday",
  sat: "saturday",
  saturday: "saturday",
  sun: "sunday",
  sunday: "sunday",
};

const WEEK_OUT: Record<string, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

export function weekdayToDb(raw: string) {
  return WEEK_IN[normalizeHeader(raw)] ?? "";
}

export function weekdayToCsv(raw: string | null | undefined) {
  if (!raw) return "";
  return WEEK_OUT[normalizeHeader(raw)] ?? normalizeHeader(raw).slice(0, 3);
}

export function frequencyToDb(raw: string) {
  const v = normalizeHeader(raw);
  if (v === "one_time" || v === "onetime" || v === "one_off" || v === "oneoff") return "one-off";
  if (v === "weekly" || v === "biweekly" || v === "monthly") return v;
  return "";
}

export function frequencyToCsv(raw: string | null | undefined) {
  if (!raw) return "";
  const v = normalizeHeader(raw);
  if (v === "one_off" || v === "oneoff" || v === "none") return "one-time";
  return v;
}

export function parseYesNo(raw: string) {
  const v = normalizeHeader(raw);
  if (["yes", "y", "true", "1", "on"].includes(v)) return true;
  if (["no", "n", "false", "0", "off"].includes(v)) return false;
  return null;
}

export function parseMoneyToCents(raw: string): number | null {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return 0;
  return Math.round(n < 1000 ? n * 100 : n);
}

export function centsToPrice(cents: number | null | undefined) {
  if (cents == null) return "";
  return (Number(cents) / 100).toFixed(2);
}

export function parseHours(raw: string): number | null {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 2) / 2;
}

export function parseEmails(raw: string) {
  return raw
    .split(/[;|,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function inferNameFromEmail(email: string) {
  const local = (email.split("@")[0] || "").trim();
  const parts = local.split(/[._+\-]+/).filter((p) => /[a-zA-Z]/.test(p));
  if (!parts.length) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

export function isValidDate(raw: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
}

export function isValidTime(raw: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(raw.trim());
}

export function normalizeTime(raw: string) {
  const m = raw.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return "";
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

export function scheduleStatus(raw: string) {
  const v = normalizeHeader(raw);
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "paid") return "paid";
  if (v === "unpaid") return "unpaid";
  if (v === "scheduled" || v === "completed") return "scheduled";
  return "";
}
