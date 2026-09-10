import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { JOB_FROM, JOB_SELECT, assertClient, assertOffice, assertStaff, getActor, isOffice, masterUserId } from "./access";
import {
  applyAssigneesToClientRecurring,
  getClientAssigneeIds,
  hydrateJob,
  redactJobMoney,
  replaceClientAssignees,
  replaceJobAssignees,
  teamCanAccessJob,
} from "./assignees";
import { insertNotification } from "./notifications";
import { addressPartsFrom, formatAddress } from "./people";
import { ensureDemoSeed } from "./seed";
import { findTimeOffHits, type TimeOffHit } from "./time-off";
import {
  addDaysChicago,
  addMinutes,
  chicagoDate,
  fromDatetimeLocalValue,
  formatDateTime,
  hoursUntil,
  nid,
  nextWeekdayOnOrAfter,
  partsInChicago,
  startOfChicagoDay,
  weekdayNameInChicago,
} from "./time";
import type { JobRow, JobWithClient, Recurrence, RecurringPlan } from "./types";

export type ConflictHit = {
  cleanerUserId: string;
  cleanerName: string;
  otherJobId: string;
  otherClientName: string;
  otherStartAt: string;
};

export const listJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string; assignedToUserId?: string; clientId?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    if (isOffice(actor)) {
      const ownerId = masterUserId(actor);
      const params: unknown[] = [ownerId, data.from, data.to];
      let extraSql = "";
      let next = 4;
      // Office-only filters. Team / client callers ignore a client-sent id.
      if (data.assignedToUserId) {
        const member = await sql.query<{ user_id: string }>(
          `select user_id from profiles
           where user_id = $1 and master_user_id = $2 and role = 'cleaner'
             and coalesce(cleaner_kind, 'team') = 'team'
           limit 1`,
          [data.assignedToUserId, ownerId],
        );
        if (!member[0]) throw new Error("Team member not found.");
        const slot = next++;
        params.push(data.assignedToUserId);
        extraSql += ` and (
            exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $${slot})
            or (
              not exists (select 1 from job_assignees ja2 where ja2.job_id = j.id)
              and j.assigned_to_user_id = $${slot}
            )
          )`;
      }
      if (data.clientId) {
        const owned = await sql.query<{ id: string }>(
          `select id from clients where id = $1 and cleaner_user_id = $2 limit 1`,
          [data.clientId, ownerId],
        );
        if (!owned[0]) throw new Error("Client not found.");
        const slot = next++;
        params.push(data.clientId);
        extraSql += ` and j.client_id = $${slot}`;
      }
      const rows = await sql.query<JobWithClient & { assignees_json?: unknown }>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
         ${extraSql}
         order by j.start_at asc`,
        params,
      );
      return rows.map(hydrateJob);
    }
    if (actor.kind === "team") {
      if (actor.disabled) return [] as JobWithClient[];
      const rows = await sql.query<JobWithClient & { assignees_json?: unknown }>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
         order by j.start_at asc`,
        [actor.masterUserId, context.userId, data.from, data.to],
      );
      return rows.map(hydrateJob).map(redactJobMoney);
    }
    if (actor.kind === "client") {
      const rows = await sql.query<JobWithClient & { assignees_json?: unknown }>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
         order by j.start_at asc`,
        [actor.client.id, data.from, data.to],
      );
      return rows.map(hydrateJob);
    }
    return [] as JobWithClient[];
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const rows = await sql.query<JobWithClient>(
      `select ${JOB_SELECT} from ${JOB_FROM} where j.id = $1 limit 1`,
      [id],
    );
    const job = rows[0] ? hydrateJob(rows[0]) : null;
    if (!job) throw new Error("Visit not found.");
    if (isOffice(actor) && job.cleaner_user_id !== masterUserId(actor)) {
      throw new Error("Visit not found.");
    }
    if (actor.kind === "team") {
      if (actor.disabled || job.cleaner_user_id !== actor.masterUserId) {
        throw new Error("Visit not found.");
      }
      const allowed = await teamCanAccessJob(sql, context.userId, job.id);
      if (!allowed) throw new Error("Visit not found.");
    }
    if (actor.kind === "client" && job.client_id !== actor.client.id) {
      throw new Error("Visit not found.");
    }
    if (actor.kind === "none" || actor.kind === "client_unlinked") {
      throw new Error("Visit not found.");
    }
    const visible = actor.kind === "team" ? redactJobMoney(job) : job;
    const policy =
      actor.kind === "cleaner"
        ? actor.profile.cancellation_policy
        : actor.kind === "admin"
          ? (
              await sql<{ cancellation_policy: string | null }>`
                select cancellation_policy from profiles where user_id = ${job.cleaner_user_id} limit 1
              `
            )[0]?.cancellation_policy
        : (
            await sql<{ cancellation_policy: string | null }>`
              select cancellation_policy from profiles where user_id = ${job.cleaner_user_id} limit 1
            `
          )[0]?.cancellation_policy;
    const staff = await sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles
      where master_user_id = ${job.cleaner_user_id} and coalesce(team_status, 'active') = 'active'
        and coalesce(cleaner_kind, 'team') = 'team'
      order by full_name
    `;
    const assigneeIds = [
      ...new Set(
        [
          ...(job.assignees ?? []).map((a) => a.user_id),
          job.assigned_to_user_id,
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const overlapIds =
      actor.kind === "team" ? assigneeIds.filter((id) => id === context.userId) : assigneeIds;
    const overlaps =
      actor.kind === "client" || job.status === "cancelled" || !overlapIds.length
        ? ([] as ConflictHit[])
        : await findConflicts(
            sql,
            job.cleaner_user_id,
            new Date(job.start_at),
            job.duration_min,
            job.id,
            overlapIds,
            { excludeCancelledOnly: true },
          );
    return {
      job: visible,
      cancellationPolicy: policy ?? null,
      hoursUntil: hoursUntil(job.start_at),
      staff,
      overlaps,
    };
  });

export type JobInput = {
  clientId: string;
  service: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  startLocal: string;
  durationMin: number;
  priceCents: number;
  notes?: string;
  recurrence: Recurrence;
  assignedToUserId?: string | null;
  assignedToUserIds?: string[];
};

function parseJobInput(input: JobInput): JobInput {
  if (!input.clientId) throw new Error("Choose a client.");
  if (!input.startLocal) throw new Error("Choose a date and time.");
  const durationMin = Number(input.durationMin);
  const priceCents = Number(input.priceCents);
  if (!durationMin || durationMin < 30) throw new Error("Duration must be at least 0.5 hours.");
  if (priceCents < 0) throw new Error("Price cannot be negative.");
  const recurrence = input.recurrence || "none";
  let assignedToUserIds: string[] | undefined;
  if (Array.isArray(input.assignedToUserIds)) {
    assignedToUserIds = input.assignedToUserIds.filter(Boolean);
  } else if (input.assignedToUserId) {
    assignedToUserIds = [input.assignedToUserId];
  }
  const parts = addressPartsFrom(input);
  return {
    clientId: input.clientId,
    service: input.service.trim() || "House cleaning",
    address: formatAddress(parts, input.address?.trim() || "") || undefined,
    address_line1: parts.address_line1 || undefined,
    address_line2: parts.address_line2 || undefined,
    city: parts.city || undefined,
    state: parts.state || undefined,
    zip: parts.zip || undefined,
    startLocal: input.startLocal,
    durationMin,
    priceCents,
    notes: input.notes?.trim() || undefined,
    recurrence,
    assignedToUserIds,
  };
}

async function loadAssigneeMap(sql: Awaited<ReturnType<typeof getSql>>, jobIds: string[]) {
  const map = new Map<string, string[]>();
  if (!jobIds.length) return map;
  const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query<{ job_id: string; user_id: string }>(
    `select job_id, user_id from job_assignees where job_id in (${placeholders})`,
    jobIds,
  );
  for (const row of rows) {
    const list = map.get(row.job_id) ?? [];
    list.push(row.user_id);
    map.set(row.job_id, list);
  }
  return map;
}

async function loadNames(sql: Awaited<ReturnType<typeof getSql>>, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query<{ user_id: string; full_name: string }>(
    `select user_id, full_name from profiles where user_id in (${placeholders})`,
    unique,
  );
  for (const row of rows) map.set(row.user_id, row.full_name);
  return map;
}

function timesOverlap(aStart: Date, aMin: number, bStart: Date, bMin: number) {
  const aEnd = addMinutes(aStart, aMin);
  const bEnd = addMinutes(bStart, bMin);
  return aStart < bEnd && bStart < aEnd;
}

function dedupeHits(hits: ConflictHit[]) {
  const seen = new Set<string>();
  const out: ConflictHit[] = [];
  for (const hit of hits) {
    const key = `${hit.cleanerUserId}|${hit.otherJobId}|${hit.otherStartAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

async function findConflicts(
  sql: Awaited<ReturnType<typeof getSql>>,
  cleanerId: string,
  start: Date,
  durationMin: number,
  ignoreId?: string,
  assignedTo?: string[],
  opts?: { excludeCancelledOnly?: boolean },
): Promise<ConflictHit[]> {
  const mine = [...new Set((assignedTo ?? []).filter(Boolean))];
  if (!mine.length) return [];
  const end = addMinutes(start, durationMin);
  const windowStart = addMinutes(start, -8 * 60);
  const windowEnd = addMinutes(end, 8 * 60);
  const statusSql = opts?.excludeCancelledOnly
    ? "and j.status <> 'cancelled'"
    : "and j.status in ('scheduled', 'reschedule_requested')";
  const nearby = await sql.query<{
    id: string;
    start_at: string;
    duration_min: number;
    assigned_to_user_id: string | null;
    client_name: string;
  }>(
    `select j.id, j.start_at::text as start_at, j.duration_min, j.assigned_to_user_id, c.name as client_name
     from jobs j
     join clients c on c.id = j.client_id
     where j.cleaner_user_id = $1
       ${statusSql}
       and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
       ${ignoreId ? "and j.id <> $4" : ""}`,
    ignoreId
      ? [cleanerId, windowStart.toISOString(), windowEnd.toISOString(), ignoreId]
      : [cleanerId, windowStart.toISOString(), windowEnd.toISOString()],
  );
  const asg = await loadAssigneeMap(
    sql,
    nearby.map((j) => j.id),
  );
  const names = await loadNames(sql, mine);
  const hits: ConflictHit[] = [];
  for (const j of nearby) {
    const theirs = asg.get(j.id) ?? (j.assigned_to_user_id ? [j.assigned_to_user_id] : []);
    if (!theirs.length) continue;
    if (!timesOverlap(start, durationMin, new Date(j.start_at), Number(j.duration_min))) continue;
    for (const uid of mine) {
      if (!theirs.includes(uid)) continue;
      hits.push({
        cleanerUserId: uid,
        cleanerName: names.get(uid) || "Cleaner",
        otherJobId: j.id,
        otherClientName: j.client_name,
        otherStartAt: j.start_at,
      });
    }
  }
  return hits;
}

async function findConflictsForStarts(
  sql: Awaited<ReturnType<typeof getSql>>,
  cleanerId: string,
  starts: Date[],
  durationMin: number,
  ignoreId: string | undefined,
  assignedTo: string[] | undefined,
) {
  const hits: ConflictHit[] = [];
  for (const start of starts) {
    hits.push(...(await findConflicts(sql, cleanerId, start, durationMin, ignoreId, assignedTo)));
  }
  return dedupeHits(hits);
}

/** Occurrences from S forward. Recurring series never materialize history before S or before today. */
function occurrenceStarts(first: Date, recurrence: Recurrence, now = new Date()): Date[] {
  if (recurrence === "none") return [first];
  const stepDays = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 28;
  const count = recurrence === "monthly" ? 12 : 26;
  const p0 = partsInChicago(first);
  const seriesStart = first.getTime();
  const notBefore = startOfChicagoDay(now).getTime();
  const out: Date[] = [];
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

async function deleteJobsCascade(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  ids: string[],
) {
  for (const id of ids) {
    await sql`delete from job_assignees where job_id = ${id}`;
    await sql`update invoices set job_id = null where job_id = ${id} and status = 'paid'`;
    await sql`delete from invoices where job_id = ${id} and status <> 'paid'`;
    await sql`delete from notifications where job_id = ${id}`;
    await sql`delete from reminder_sends where job_id = ${id}`;
    await sql`delete from jobs where id = ${id} and cleaner_user_id = ${ownerId}`;
  }
}

async function notifyAssignees(
  sql: Awaited<ReturnType<typeof getSql>>,
  userIds: string[],
  clientId: string,
  clientName: string,
  jobId?: string,
  body?: string,
) {
  for (const userId of userIds) {
    await insertNotification(sql, {
      userId,
      kind: "job_assigned",
      title: `Assigned: ${clientName}`,
      body: body ?? "A visit was assigned to you.",
      jobId: jobId ?? null,
      clientId,
      clientName,
    });
  }
}

export const checkJobConflicts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    startLocal: string;
    durationMin: number;
    ignoreId?: string;
    assignedToUserIds?: string[];
    recurrence?: Recurrence;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const first = fromDatetimeLocalValue(data.startLocal);
    const starts = occurrenceStarts(first, data.recurrence || "none");
    const durationMin = Number(data.durationMin) || 120;
    const hits = await findConflictsForStarts(
      sql,
      ownerId,
      starts,
      durationMin,
      data.ignoreId,
      data.assignedToUserIds,
    );
    const timeOff = await findTimeOffHits(
      sql,
      ownerId,
      starts,
      durationMin,
      data.assignedToUserIds ?? [],
      { horizonWeeks: data.recurrence && data.recurrence !== "none" ? 8 : undefined },
    );
    return { conflicts: hits, timeOff };
  });

export const checkAssignConflicts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; assignedToUserIds: string[]; scope: "visit" | "client_recurring" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const ids = [...new Set((data.assignedToUserIds ?? []).filter(Boolean))];
    const jobRows = await sql.query<{
      id: string;
      client_id: string;
      start_at: string;
      duration_min: number;
    }>(
      `select id, client_id, start_at::text as start_at, duration_min
       from jobs
       where id = $1 and cleaner_user_id = $2
       limit 1`,
      [data.jobId, ownerId],
    );
    const job = jobRows[0];
    if (!job) throw new Error("Visit not found.");
    if (!ids.length) return { conflicts: [] as ConflictHit[], timeOff: [] as TimeOffHit[] };

    const extras =
      data.scope === "client_recurring"
        ? await sql.query<{ id: string; start_at: string; duration_min: number }>(
            `select id, start_at::text as start_at, duration_min from jobs
             where cleaner_user_id = $1
               and client_id = $2
               and status in ('scheduled', 'reschedule_requested')
               and start_at >= now()
               and recurrence <> 'none'
             order by start_at asc`,
            [ownerId, job.client_id],
          )
        : [];
    const seen = new Set<string>([job.id]);
    const list: { id: string; start_at: string; duration_min: number }[] = [job];
    for (const row of extras) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      list.push(row);
    }
    const hits: ConflictHit[] = [];
    const timeOff: TimeOffHit[] = [];
    const seenOff = new Set<string>();
    const horizon = addDaysChicago(startOfChicagoDay(new Date()), 56);
    for (const row of list) {
      const start = new Date(row.start_at);
      hits.push(
        ...(await findConflicts(
          sql,
          ownerId,
          start,
          Number(row.duration_min),
          row.id,
          ids,
        )),
      );
      if (data.scope === "client_recurring" && start >= horizon) continue;
      const offs = await findTimeOffHits(sql, ownerId, [start], Number(row.duration_min), ids);
      for (const hit of offs) {
        const key = `${hit.userId}|${hit.requestId}|${hit.status}`;
        if (seenOff.has(key)) continue;
        seenOff.add(key);
        timeOff.push(hit);
      }
    }
    return { conflicts: dedupeHits(hits), timeOff };
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: JobInput) => parseJobInput(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const clients = await sql<{
      id: string;
      address: string | null;
      name: string;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    }>`
      select id, address, name, address_line1, address_line2, city, state, zip
      from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    const client = clients[0];
    if (!client) throw new Error("Client not found.");
    const jobParts = data.address_line1 || data.city ? addressPartsFrom(data) : addressPartsFrom(client);
    const jobAddress = formatAddress(jobParts, data.address || client.address || "");
    const inherited = await getClientAssigneeIds(sql, data.clientId);
    const assigneeIds = data.assignedToUserIds !== undefined ? data.assignedToUserIds : inherited;
    const first = fromDatetimeLocalValue(data.startLocal);
    const starts = occurrenceStarts(first, data.recurrence);
    if (!starts.length) {
      throw new Error("No visits fall on or after today for this schedule.");
    }
    const seriesId = data.recurrence === "none" ? null : nid("series");
    const created: { id: string; start: string }[] = [];
    let conflictCount = 0;
    for (const start of starts) {
      const hits = await findConflicts(sql, ownerId, start, data.durationMin, undefined, assigneeIds);
      if (hits.length) conflictCount += 1;
      const id = nid("job");
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address,
          address_line1, address_line2, city, state, zip,
          start_at, duration_min, price_cents, notes, status, recurrence, series_id, assigned_to_user_id
        ) values (
          ${id}, ${ownerId}, ${data.clientId}, ${data.service},
          ${jobAddress || null}, ${jobParts.address_line1 || null}, ${jobParts.address_line2 || null},
          ${jobParts.city || null}, ${jobParts.state || null}, ${jobParts.zip || null},
          ${start.toISOString()}, ${data.durationMin},
          ${data.priceCents}, ${data.notes ?? null}, ${"scheduled"}, ${data.recurrence}, ${seriesId},
          ${assigneeIds[0] ?? null}
        )
      `;
      await replaceJobAssignees(sql, id, assigneeIds);
      created.push({ id, start: start.toISOString() });
    }
    if (assigneeIds.length) {
      await notifyAssignees(
        sql,
        assigneeIds,
        data.clientId,
        client.name,
        created[0]?.id,
        `${starts.length} visit${starts.length === 1 ? "" : "s"} added to your book.`,
      );
    }
    return { id: created[0]?.id, startAt: created[0]?.start, count: created.length, conflictCount };
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: JobInput & { id: string; status?: string }) => ({
    id: input.id,
    status: input.status,
    ...parseJobInput(input),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const start = fromDatetimeLocalValue(data.startLocal);
    const assigneeIds = data.assignedToUserIds ?? [];
    const parts = addressPartsFrom(data);
    await sql`
      update jobs set
        client_id = ${data.clientId},
        service = ${data.service},
        address = ${data.address ?? (formatAddress(parts) || null)},
        address_line1 = ${parts.address_line1 || null},
        address_line2 = ${parts.address_line2 || null},
        city = ${parts.city || null},
        state = ${parts.state || null},
        zip = ${parts.zip || null},
        start_at = ${start.toISOString()},
        duration_min = ${data.durationMin},
        price_cents = ${data.priceCents},
        notes = ${data.notes ?? null},
        status = ${data.status ?? "scheduled"},
        assigned_to_user_id = ${assigneeIds[0] ?? null}
      where id = ${data.id} and cleaner_user_id = ${ownerId}
    `;
    await replaceJobAssignees(sql, data.id, assigneeIds);
    const hits = await findConflicts(sql, ownerId, start, data.durationMin, data.id, assigneeIds);
    return { ok: true, conflictCount: hits.length };
  });

export const assignJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; assignedToUserIds: string[]; scope: "visit" | "client_recurring" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const rows = await sql<{ id: string; client_id: string }>`
      select id, client_id from jobs where id = ${data.id} and cleaner_user_id = ${ownerId} limit 1
    `;
    const job = rows[0];
    if (!job) throw new Error("Visit not found.");
    const ids = [...new Set((data.assignedToUserIds ?? []).filter(Boolean))];
    const clients = await sql<{ name: string }>`select name from clients where id = ${job.client_id} limit 1`;
    if (data.scope === "client_recurring") {
      await replaceClientAssignees(sql, job.client_id, ids);
      await applyAssigneesToClientRecurring(sql, job.client_id, ids);
      await replaceJobAssignees(sql, job.id, ids);
    } else {
      await replaceJobAssignees(sql, job.id, ids);
    }
    if (ids.length) {
      await notifyAssignees(
        sql,
        ids,
        job.client_id,
        clients[0]?.name || "a visit",
        job.id,
        data.scope === "client_recurring"
          ? "You were assigned to this client's recurring visits."
          : "A visit was assigned to you.",
      );
    }
    return { ok: true };
  });

export const setJobStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: "scheduled" | "cancelled"; reason?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertStaff(actor);
    const ownerId = masterUserId(actor);
    const rows = await sql<JobRow>`
      select id, series_id, start_at::text as start_at, assigned_to_user_id, client_id, price_cents, service
      from jobs
      where id = ${data.id} and cleaner_user_id = ${ownerId} limit 1
    `;
    const job = rows[0];
    if (!job) throw new Error("Visit not found.");
    if (actor.kind === "team") {
      throw new Error("Team cleaners cannot change visit status.");
    }
    await sql`
      update jobs set status = ${data.status}, cancel_reason = ${data.reason ?? null}
      where id = ${data.id} and cleaner_user_id = ${ownerId}
    `;
    return { ok: true };
  });

function parseEffectiveDate(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("Choose an effective date.");
  return fromDatetimeLocalValue(`${raw}T00:00`);
}

function parseClock(raw: string) {
  const [hh, mm] = (raw || "").split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    throw new Error("Choose a time.");
  }
  return { hour: hh, minute: mm };
}

async function loadRecurringPlans(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  clientId: string,
  seriesId?: string,
): Promise<RecurringPlan[]> {
  const params: unknown[] = [ownerId, clientId];
  let seriesSql = "";
  if (seriesId) {
    params.push(seriesId);
    seriesSql = "and j.series_id = $3";
  }
  const seriesRows = await sql.query<{ series_id: string }>(
    `select distinct j.series_id
     from jobs j
     where j.cleaner_user_id = $1 and j.client_id = $2
       and j.series_id is not null ${seriesSql}`,
    params,
  );
  const plans: RecurringPlan[] = [];
  for (const row of seriesRows) {
    const sid = row.series_id;
    const jobs = await sql<{
      id: string;
      start_at: string;
      duration_min: number;
      price_cents: number;
      service: string;
      recurrence: Recurrence;
      status: string;
      client_name: string;
    }>`
      select j.id, j.start_at::text as start_at, j.duration_min, j.price_cents, j.service,
             j.recurrence, j.status, c.name as client_name
      from jobs j
      join clients c on c.id = j.client_id
      where j.series_id = ${sid} and j.cleaner_user_id = ${ownerId}
      order by j.start_at asc
    `;
    if (!jobs.length) continue;
    const now = Date.now();
    const futureScheduled = jobs.filter(
      (j) => new Date(j.start_at).getTime() >= now && (j.status === "scheduled" || j.status === "reschedule_requested"),
    );
    const template = futureScheduled[0] ?? jobs[jobs.length - 1];
    const assigneeIds = await sql<{ user_id: string; full_name: string }>`
      select ja.user_id, p.full_name
      from job_assignees ja
      join profiles p on p.user_id = ja.user_id
      where ja.job_id = ${template.id}
      order by p.full_name
    `;
    const p = partsInChicago(template.start_at);
    plans.push({
      seriesId: sid,
      clientId,
      clientName: template.client_name,
      recurrence: template.recurrence === "none" ? "weekly" : template.recurrence,
      weekday: weekdayNameInChicago(template.start_at),
      time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
      durationMin: Number(template.duration_min),
      priceCents: Number(template.price_cents),
      service: template.service,
      assignedToUserIds: assigneeIds.map((a) => a.user_id),
      assignedNames: assigneeIds.map((a) => a.full_name),
      nextStartAt: futureScheduled[0]?.start_at ?? null,
      futureCount: futureScheduled.length,
    });
  }
  return plans;
}

export const listClientSeries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; seriesId?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const owned = await sql<{ id: string }>`
      select id from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!owned[0]) throw new Error("Client not found.");
    return loadRecurringPlans(sql, ownerId, data.clientId, data.seriesId);
  });

export const saveRecurringPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    seriesId: string;
    clientId: string;
    frequency: Recurrence;
    weekday: string;
    time: string;
    durationMin: number;
    priceCents: number;
    assignedToUserIds: string[];
    effectiveDate: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    if (data.frequency === "none") throw new Error("Choose weekly, biweekly, or monthly.");
    const durationMin = Number(data.durationMin);
    const priceCents = Number(data.priceCents);
    if (!durationMin || durationMin < 30) throw new Error("Duration must be at least 0.5 hours.");
    if (priceCents < 0) throw new Error("Price cannot be negative.");
    const effective = parseEffectiveDate(data.effectiveDate);
    const clock = parseClock(data.time);
    const assigneeIds = [...new Set((data.assignedToUserIds ?? []).filter(Boolean))];

    const clients = await sql<{ id: string; name: string; address: string | null; notes: string | null }>`
      select id, name, address, notes from clients
      where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    const client = clients[0];
    if (!client) throw new Error("Client not found.");

    const seriesJobs = await sql<{
      id: string;
      start_at: string;
      status: string;
      service: string;
      address: string | null;
      notes: string | null;
    }>`
      select id, start_at::text as start_at, status, service, address, notes
      from jobs
      where series_id = ${data.seriesId} and cleaner_user_id = ${ownerId} and client_id = ${data.clientId}
      order by start_at asc
    `;
    if (!seriesJobs.length) throw new Error("Recurring schedule not found.");

    const template = seriesJobs[seriesJobs.length - 1];
    const first = nextWeekdayOnOrAfter(effective, data.weekday, clock.hour, clock.minute);
    const starts = occurrenceStarts(first, data.frequency);

    const keepIds = new Set(
      seriesJobs
        .filter((j) => new Date(j.start_at).getTime() < effective.getTime() || j.status === "completed")
        .map((j) => j.id),
    );
    const removeIds = seriesJobs.filter((j) => !keepIds.has(j.id)).map((j) => j.id);
    await deleteJobsCascade(sql, ownerId, removeIds);

    const remaining = await sql<{ start_at: string }>`
      select start_at::text as start_at from jobs
      where series_id = ${data.seriesId} and cleaner_user_id = ${ownerId}
    `;
    const taken = new Set(remaining.map((r) => new Date(r.start_at).toISOString()));

    let created = 0;
    let conflictCount = 0;
    for (const start of starts) {
      if (taken.has(start.toISOString())) continue;
      const hits = await findConflicts(sql, ownerId, start, durationMin, undefined, assigneeIds);
      if (hits.length) conflictCount += 1;
      const id = nid("job");
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address, start_at, duration_min,
          price_cents, notes, status, recurrence, series_id, assigned_to_user_id
        ) values (
          ${id}, ${ownerId}, ${data.clientId}, ${template.service},
          ${template.address || client.address}, ${start.toISOString()}, ${durationMin},
          ${priceCents}, ${template.notes ?? client.notes}, ${"scheduled"}, ${data.frequency}, ${data.seriesId},
          ${assigneeIds[0] ?? null}
        )
      `;
      await replaceJobAssignees(sql, id, assigneeIds);
      created += 1;
    }

    await sql`
      update clients set
        usual_day = ${data.weekday},
        usual_time = ${data.time},
        frequency = ${data.frequency},
        default_price_cents = ${priceCents},
        default_duration_min = ${durationMin}
      where id = ${data.clientId} and cleaner_user_id = ${ownerId}
    `;
    await replaceClientAssignees(sql, data.clientId, assigneeIds);

    return { ok: true, created, conflictCount };
  });

export const cancelFutureRecurring = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { seriesId: string; clientId: string; effectiveDate: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const effective = parseEffectiveDate(data.effectiveDate);
    const owned = await sql<{ id: string }>`
      select id from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!owned[0]) throw new Error("Client not found.");
    const rows = await sql<{ id: string; status: string }>`
      select id, status from jobs
      where series_id = ${data.seriesId}
        and cleaner_user_id = ${ownerId}
        and client_id = ${data.clientId}
        and start_at >= ${effective.toISOString()}::timestamptz
        and status <> 'completed'
    `;
    await deleteJobsCascade(sql, ownerId, rows.map((r) => r.id));
    return { ok: true, cancelled: rows.length };
  });

export const removeJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const rows = await sql<{ id: string }>`
      select id from jobs where id = ${data.id} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!rows[0]) throw new Error("Visit not found.");
    await deleteJobsCascade(sql, ownerId, [data.id]);
    return { ok: true };
  });

export const clientCancelOrReschedule = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; action: "cancel" | "reschedule"; note?: string; requestedStart?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertClient(actor);
    const rows = await sql<JobRow>`
      select id, start_at::text as start_at, status, cleaner_user_id, assigned_to_user_id, client_id
      from jobs
      where id = ${data.id} and client_id = ${actor.client.id} limit 1
    `;
    const job = rows[0];
    if (!job) throw new Error("Visit not found.");
    if (job.status === "cancelled" || job.status === "completed") {
      throw new Error("This visit can no longer be changed.");
    }
    if (data.action === "reschedule") {
      throw new Error("Rescheduling is no longer available. Cancel this visit if you need a new time.");
    }
    const within24 = hoursUntil(job.start_at) < 24;
    await sql`
      update jobs set status = 'cancelled', cancel_reason = ${data.note ?? null}
      where id = ${data.id} and client_id = ${actor.client.id}
    `;
    const title = `${actor.client.name} cancelled a visit`;
    const bodyParts = [formatDateTime(job.start_at), data.note ? data.note : null].filter(Boolean);
    const recipients = new Set<string>([job.cleaner_user_id]);
    const assignees = await sql<{ user_id: string }>`select user_id from job_assignees where job_id = ${job.id}`;
    for (const a of assignees) recipients.add(a.user_id);
    if (job.assigned_to_user_id) recipients.add(job.assigned_to_user_id);
    for (const userId of recipients) {
      await insertNotification(sql, {
        userId,
        kind: "cancel",
        title,
        body: bodyParts.join(" · ") || null,
        jobId: job.id,
        clientId: actor.client.id,
        clientName: actor.client.name,
        requestedStartAt: job.start_at,
      });
    }
    return { ok: true, within24 };
  });
