import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertOffice, assertStaff, getActor, isOffice, masterUserId } from "./access";
import { insertNotification } from "./notifications";
import { ensureDemoSeed } from "./seed";
import {
  addDaysChicago,
  chicagoDate,
  chicagoDateInputValue,
  fromDatetimeLocalValue,
  nid,
  partsInChicago,
  startOfChicagoDay,
} from "./time";
import type { Recurrence } from "./types";
import {
  formatTimeOffDates,
  jobOverlapsTimeOff,
  timeOffWindow,
  type TimeOffKind,
  type TimeOffStatus,
} from "./time-off-overlap";

export type TimeOffRow = {
  id: string;
  master_user_id: string;
  user_id: string;
  user_name: string;
  kind: TimeOffKind;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  deny_note: string | null;
  status: TimeOffStatus;
  created_by_user_id: string;
  handled_by_user_id: string | null;
  handled_at: string | null;
  created_at: string;
};

export type TimeOffHit = {
  userId: string;
  name: string;
  status: "approved" | "pending";
  dates: string;
  requestId: string;
};

export type TimeOffJobConflict = {
  id: string;
  clientName: string;
  startAt: string;
};

export type TimeOffPerson = {
  user_id: string;
  full_name: string;
  kind: "master" | "team";
};

const SELECT = `
  t.id, t.master_user_id, t.user_id, p.full_name as user_name,
  t.kind, t.start_date, t.end_date, t.start_time, t.end_time,
  t.note, t.deny_note, t.status, t.created_by_user_id, t.handled_by_user_id,
  t.handled_at::text as handled_at, t.created_at::text as created_at
`;

function parseKind(raw: unknown): TimeOffKind {
  return raw === "range" ? "range" : "all_day";
}

function parseInput(input: {
  userId?: string;
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}) {
  const kind = parseKind(input.kind);
  const startDate = String(input.startDate || "").slice(0, 10);
  const endDate = String(input.endDate || startDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Pick a start and end date.");
  }
  if (endDate < startDate) throw new Error("End date cannot be before the start date.");
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (kind === "range") {
    startTime = String(input.startTime || "").slice(0, 5) || null;
    endTime = String(input.endTime || "").slice(0, 5) || null;
    if (!startTime || !endTime) throw new Error("Pick a start and end time.");
    if (startDate === endDate && endTime <= startTime) {
      throw new Error("End time must be after the start time.");
    }
  }
  return {
    userId: input.userId,
    kind,
    startDate,
    endDate,
    startTime,
    endTime,
    note: input.note?.trim() ? input.note.trim().slice(0, 400) : null,
  };
}

async function assertTimeOffTarget(sql: Sql, ownerId: string, userId: string) {
  if (userId === ownerId) return;
  const rows = await sql<{ user_id: string }>`
    select user_id from profiles
    where user_id = ${userId}
      and master_user_id = ${ownerId}
      and role = 'cleaner'
      and coalesce(cleaner_kind, 'team') = 'team'
      and coalesce(team_status, 'active') = 'active'
    limit 1
  `;
  if (!rows[0]) throw new Error("That cleaner is not on this team.");
}

async function loadRow(sql: Sql, id: string, ownerId: string) {
  const rows = await sql.query<TimeOffRow>(
    `select ${SELECT}
     from time_off t
     join profiles p on p.user_id = t.user_id
     where t.id = $1 and t.master_user_id = $2
     limit 1`,
    [id, ownerId],
  );
  return rows[0] ?? null;
}

export async function jobsOverlappingTimeOff(
  sql: Sql,
  ownerId: string,
  userId: string,
  row: { kind: TimeOffKind; start_date: string; end_date: string; start_time: string | null; end_time: string | null },
): Promise<TimeOffJobConflict[]> {
  const w = timeOffWindow(row);
  const padStart = addDaysChicago(w.start, -1);
  const padEnd = addDaysChicago(w.end, 1);
  const jobs = await sql.query<{
    id: string;
    start_at: string;
    duration_min: number;
    client_name: string;
    assigned_to_user_id: string | null;
  }>(
    `select j.id, j.start_at::text as start_at, j.duration_min, c.name as client_name, j.assigned_to_user_id
     from jobs j
     join clients c on c.id = j.client_id
     where j.cleaner_user_id = $1
       and j.status <> 'cancelled'
       and j.start_at >= $2::timestamptz
       and j.start_at < $3::timestamptz`,
    [ownerId, padStart.toISOString(), padEnd.toISOString()],
  );
  if (!jobs.length) return [];
  const asg = await sql.query<{ job_id: string; user_id: string }>(
    `select job_id, user_id from job_assignees where job_id in (${jobs.map((_, i) => `$${i + 1}`).join(", ")})`,
    jobs.map((j) => j.id),
  );
  const map = new Map<string, string[]>();
  for (const a of asg) {
    const list = map.get(a.job_id) ?? [];
    list.push(a.user_id);
    map.set(a.job_id, list);
  }
  const out: TimeOffJobConflict[] = [];
  for (const job of jobs) {
    const ids = map.get(job.id) ?? (job.assigned_to_user_id ? [job.assigned_to_user_id] : []);
    if (!ids.includes(userId)) continue;
    if (!jobOverlapsTimeOff(new Date(job.start_at), Number(job.duration_min), row)) continue;
    out.push({ id: job.id, clientName: job.client_name, startAt: job.start_at });
  }
  return out;
}

export async function findTimeOffHits(
  sql: Sql,
  ownerId: string,
  starts: Date[],
  durationMin: number,
  userIds: string[],
  opts?: { horizonWeeks?: number },
): Promise<TimeOffHit[]> {
  const mine = [...new Set(userIds.filter(Boolean))];
  if (!mine.length || !starts.length) return [];
  const horizonWeeks = opts?.horizonWeeks;
  const now = startOfChicagoDay(new Date());
  const horizonEnd = horizonWeeks ? addDaysChicago(now, horizonWeeks * 7) : null;
  const checkStarts = horizonEnd ? starts.filter((s) => s < horizonEnd && s >= now) : starts;
  const useStarts = checkStarts.length ? checkStarts : starts;
  const minStart = useStarts.reduce((a, b) => (a < b ? a : b));
  const maxStart = useStarts.reduce((a, b) => (a > b ? a : b));
  const placeholders = mine.map((_, i) => `$${i + 4}`).join(", ");
  const rows = await sql.query<TimeOffRow>(
    `select ${SELECT}
     from time_off t
     join profiles p on p.user_id = t.user_id
     where t.master_user_id = $1
       and t.status in ('pending', 'approved')
       and t.start_date <= $2
       and t.end_date >= $3
       and t.user_id in (${placeholders})`,
    [ownerId, chicagoDateInputValue(addDaysChicago(maxStart, 2)), chicagoDateInputValue(addDaysChicago(minStart, -2)), ...mine],
  );
  const hits: TimeOffHit[] = [];
  const seen = new Set<string>();
  for (const start of useStarts) {
    for (const row of rows) {
      if (!jobOverlapsTimeOff(start, durationMin, row)) continue;
      const key = `${row.user_id}|${row.id}|${row.status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        userId: row.user_id,
        name: row.user_name,
        status: row.status === "approved" ? "approved" : "pending",
        dates: formatTimeOffDates(row),
        requestId: row.id,
      });
    }
  }
  hits.sort((a, b) => (a.status === "approved" && b.status !== "approved" ? -1 : 0));
  return hits;
}

export const listTimeOffPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const team = await sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles
      where master_user_id = ${ownerId}
        and coalesce(team_status, 'active') = 'active'
        and coalesce(cleaner_kind, 'team') = 'team'
      order by full_name
    `;
    const master = await sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles where user_id = ${ownerId} limit 1
    `;
    const people: TimeOffPerson[] = [
      ...team.map((t) => ({ ...t, kind: "team" as const })),
      ...(master[0] ? [{ ...master[0], kind: "master" as const }] : []),
    ];
    return people;
  });

export const listTimeOff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input?: { from?: string; to?: string; upcomingOnly?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertStaff(actor);
    const ownerId = masterUserId(actor);
    const params: unknown[] = [ownerId];
    let extra = "";
    if (actor.kind === "team") {
      params.push(actor.userId);
      extra += ` and t.user_id = $${params.length}`;
    }
    if (data.from) {
      params.push(data.from);
      extra += ` and t.end_date >= $${params.length}`;
    } else if (data.upcomingOnly !== false) {
      params.push(chicagoDateInputValue());
      extra += ` and (t.end_date >= $${params.length} or t.status = 'pending')`;
    }
    if (data.to) {
      params.push(data.to);
      extra += ` and t.start_date <= $${params.length}`;
    }
    extra += ` and t.status <> 'cancelled'`;
    const rows = await sql.query<TimeOffRow>(
      `select ${SELECT}
       from time_off t
       join profiles p on p.user_id = t.user_id
       where t.master_user_id = $1 ${extra}
       order by t.start_date asc, t.created_at desc`,
      params,
    );
    return rows;
  });

export const createTimeOff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    userId?: string;
    kind: TimeOffKind;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    note?: string | null;
  }) => parseInput(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertStaff(actor);
    const ownerId = masterUserId(actor);
    const office = isOffice(actor);
    const userId = office ? data.userId || ownerId : actor.userId;
    if (!office && userId !== actor.userId) {
      throw new Error("You can only request time off for yourself.");
    }
    await assertTimeOffTarget(sql, ownerId, userId);
    const status: TimeOffStatus = office ? "approved" : "pending";
    const id = nid("toff");
    await sql`
      insert into time_off (
        id, master_user_id, user_id, kind, start_date, end_date, start_time, end_time,
        note, status, created_by_user_id, handled_by_user_id, handled_at
      ) values (
        ${id}, ${ownerId}, ${userId}, ${data.kind}, ${data.startDate}, ${data.endDate},
        ${data.startTime}, ${data.endTime}, ${data.note}, ${status}, ${actor.userId},
        ${office ? actor.userId : null}, ${office ? new Date().toISOString() : null}
      )
    `;
    const row = await loadRow(sql, id, ownerId);
    if (!row) throw new Error("Could not save time off.");
    const jobs = office ? await jobsOverlappingTimeOff(sql, ownerId, userId, row) : [];
    if (!office) {
      await insertNotification(sql, {
        userId: ownerId,
        kind: "time_off",
        title: `${row.user_name} requested time off`,
        body: formatTimeOffDates(row) + (row.note ? ` · ${row.note}` : ""),
      });
    }
    return { row, jobs };
  });

export const updateTimeOff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id: string;
    kind: TimeOffKind;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    note?: string | null;
  }) => ({ id: input.id, ...parseInput(input) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const existing = await loadRow(sql, data.id, ownerId);
    if (!existing) throw new Error("Time off not found.");
    if (existing.status === "cancelled") throw new Error("This request was cancelled.");
    await sql`
      update time_off set
        kind = ${data.kind},
        start_date = ${data.startDate},
        end_date = ${data.endDate},
        start_time = ${data.startTime},
        end_time = ${data.endTime},
        note = ${data.note}
      where id = ${existing.id}
    `;
    const row = await loadRow(sql, existing.id, ownerId);
    if (!row) throw new Error("Could not update time off.");
    const jobs = row.status === "approved" ? await jobsOverlappingTimeOff(sql, ownerId, row.user_id, row) : [];
    return { row, jobs };
  });

export const cancelTimeOff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertStaff(actor);
    const ownerId = masterUserId(actor);
    const row = await loadRow(sql, data.id, ownerId);
    if (!row) throw new Error("Time off not found.");
    if (!isOffice(actor) && row.user_id !== actor.userId) {
      throw new Error("You can only cancel your own time off.");
    }
    if (row.status === "cancelled") return { ok: true };
    if (row.status === "denied") throw new Error("This request was already denied.");
    if (row.status === "approved" && row.end_date < chicagoDateInputValue()) {
      throw new Error("Past time off cannot be cancelled.");
    }
    await sql`
      update time_off set status = ${"cancelled"}, handled_by_user_id = ${actor.userId}, handled_at = now()
      where id = ${row.id}
    `;
    return { ok: true };
  });

export const approveTimeOff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const row = await loadRow(sql, data.id, ownerId);
    if (!row) throw new Error("Time off not found.");
    if (row.status !== "pending") throw new Error("Only pending requests can be approved.");
    await sql`
      update time_off set status = ${"approved"}, deny_note = null,
        handled_by_user_id = ${actor.userId}, handled_at = now()
      where id = ${row.id}
    `;
    const next = await loadRow(sql, row.id, ownerId);
    if (!next) throw new Error("Could not approve.");
    const jobs = await jobsOverlappingTimeOff(sql, ownerId, next.user_id, next);
    await insertNotification(sql, {
      userId: next.user_id,
      kind: "time_off",
      title: "Time off approved",
      body: formatTimeOffDates(next),
    });
    return { row: next, jobs };
  });

export const denyTimeOff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; note?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const row = await loadRow(sql, data.id, ownerId);
    if (!row) throw new Error("Time off not found.");
    if (row.status !== "pending") throw new Error("Only pending requests can be denied.");
    const note = data.note?.trim() ? data.note.trim().slice(0, 280) : null;
    await sql`
      update time_off set status = ${"denied"}, deny_note = ${note},
        handled_by_user_id = ${actor.userId}, handled_at = now()
      where id = ${row.id}
    `;
    await insertNotification(sql, {
      userId: row.user_id,
      kind: "time_off",
      title: "Time off denied",
      body: formatTimeOffDates(row) + (note ? ` · ${note}` : ""),
    });
    return { ok: true };
  });

export const checkTimeOffConflicts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    startLocal: string;
    durationMin: number;
    assignedToUserIds?: string[];
    recurrence?: Recurrence;
    horizonWeeks?: number;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const first = fromDatetimeLocalValue(data.startLocal);
    const starts = occurrenceStartsLocal(first, data.recurrence || "none");
    const hits = await findTimeOffHits(
      sql,
      ownerId,
      starts,
      Number(data.durationMin) || 120,
      data.assignedToUserIds ?? [],
      { horizonWeeks: data.recurrence && data.recurrence !== "none" ? data.horizonWeeks ?? 8 : undefined },
    );
    return { timeOff: hits };
  });

function occurrenceStartsLocal(first: Date, recurrence: Recurrence) {
  if (recurrence === "none") return [first];
  const stepDays = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 28;
  const count = recurrence === "monthly" ? 12 : 26;
  const p0 = partsInChicago(first);
  const out: Date[] = [];
  const seriesStart = first.getTime();
  const notBefore = startOfChicagoDay(new Date()).getTime();
  for (let i = 0; i < count; i++) {
    const day = addDaysChicago(first, i * stepDays);
    const p = partsInChicago(day);
    const start = chicagoDate(p.year, p.month, p.day, p0.hour, p0.minute);
    if (start.getTime() < seriesStart) continue;
    if (start.getTime() < notBefore) continue;
    out.push(start);
  }
  return out;
}
