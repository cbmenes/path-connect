import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { JOB_FROM, JOB_SELECT, assertCleaner, assertClient, assertStaff, getActor, masterUserId } from "./access";
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
import { ensureDemoSeed } from "./seed";
import { addDaysChicago, addMinutes, chicagoDate, fromDatetimeLocalValue, formatDateTime, hoursUntil, nid, partsInChicago } from "./time";
import type { JobRow, JobWithClient, Recurrence } from "./types";

export const listJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      const rows = await sql.query<JobWithClient & { assignees_json?: unknown }>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
         order by j.start_at asc`,
        [context.userId, data.from, data.to],
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
    if (actor.kind === "cleaner" && job.cleaner_user_id !== context.userId) {
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
        : (
            await sql<{ cancellation_policy: string | null }>`
              select cancellation_policy from profiles where user_id = ${job.cleaner_user_id} limit 1
            `
          )[0]?.cancellation_policy;
    const staff = await sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles
      where master_user_id = ${job.cleaner_user_id} and coalesce(team_status, 'active') = 'active'
      order by full_name
    `;
    return { job: visible, cancellationPolicy: policy ?? null, hoursUntil: hoursUntil(job.start_at), staff };
  });

export type JobInput = {
  clientId: string;
  service: string;
  address?: string;
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
  return {
    clientId: input.clientId,
    service: input.service.trim() || "House cleaning",
    address: input.address?.trim() || undefined,
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

function assigneesOverlap(a: string[], b: string[]) {
  if (!a.length && !b.length) return true;
  if (!a.length || !b.length) return false;
  return a.some((id) => b.includes(id));
}

async function findConflicts(
  sql: Awaited<ReturnType<typeof getSql>>,
  cleanerId: string,
  start: Date,
  durationMin: number,
  ignoreId?: string,
  assignedTo?: string[],
) {
  const end = addMinutes(start, durationMin);
  const windowStart = addMinutes(start, -8 * 60);
  const windowEnd = addMinutes(end, 8 * 60);
  const nearby = await sql.query<JobRow>(
    `select id, start_at::text as start_at, duration_min, status, assigned_to_user_id
     from jobs
     where cleaner_user_id = $1
       and status in ('scheduled', 'reschedule_requested')
       and start_at >= $2::timestamptz and start_at < $3::timestamptz
       ${ignoreId ? "and id <> $4" : ""}`,
    ignoreId
      ? [cleanerId, windowStart.toISOString(), windowEnd.toISOString(), ignoreId]
      : [cleanerId, windowStart.toISOString(), windowEnd.toISOString()],
  );
  const asg = await loadAssigneeMap(sql, nearby.map((j) => j.id));
  const mine = assignedTo?.filter(Boolean) ?? [];
  return nearby.filter((j) => {
    const theirs = asg.get(j.id) ?? (j.assigned_to_user_id ? [j.assigned_to_user_id] : []);
    if (!assigneesOverlap(mine, theirs)) return false;
    const js = new Date(j.start_at);
    const je = addMinutes(js, j.duration_min);
    return start < je && js < end;
  });
}

function occurrenceStarts(first: Date, recurrence: Recurrence): Date[] {
  if (recurrence === "none") return [first];
  const stepDays = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 28;
  const count = recurrence === "monthly" ? 12 : 26;
  const p0 = partsInChicago(first);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const day = addDaysChicago(first, i * stepDays);
    const p = partsInChicago(day);
    out.push(chicagoDate(p.year, p.month, p.day, p0.hour, p0.minute));
  }
  return out;
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
  .validator((input: { startLocal: string; durationMin: number; ignoreId?: string; assignedToUserIds?: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const start = fromDatetimeLocalValue(data.startLocal);
    const hits = await findConflicts(
      sql,
      context.userId,
      start,
      Number(data.durationMin) || 120,
      data.ignoreId,
      data.assignedToUserIds,
    );
    return { conflicts: hits.map((h) => ({ id: h.id, start_at: h.start_at, duration_min: h.duration_min })) };
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: JobInput) => parseJobInput(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const clients = await sql<{ id: string; address: string | null; name: string }>`
      select id, address, name from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1
    `;
    const client = clients[0];
    if (!client) throw new Error("Client not found.");
    const inherited = await getClientAssigneeIds(sql, data.clientId);
    const assigneeIds = data.assignedToUserIds !== undefined ? data.assignedToUserIds : inherited;
    const first = fromDatetimeLocalValue(data.startLocal);
    const starts = occurrenceStarts(first, data.recurrence);
    const seriesId = data.recurrence === "none" ? null : nid("series");
    const created: { id: string; start: string }[] = [];
    let conflictCount = 0;
    for (const start of starts) {
      const hits = await findConflicts(sql, context.userId, start, data.durationMin, undefined, assigneeIds);
      if (hits.length) conflictCount += 1;
      const id = nid("job");
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address, start_at, duration_min,
          price_cents, notes, status, recurrence, series_id, assigned_to_user_id
        ) values (
          ${id}, ${context.userId}, ${data.clientId}, ${data.service},
          ${data.address || client.address}, ${start.toISOString()}, ${data.durationMin},
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
    assertCleaner(actor);
    const start = fromDatetimeLocalValue(data.startLocal);
    const assigneeIds = data.assignedToUserIds ?? [];
    await sql`
      update jobs set
        client_id = ${data.clientId},
        service = ${data.service},
        address = ${data.address ?? null},
        start_at = ${start.toISOString()},
        duration_min = ${data.durationMin},
        price_cents = ${data.priceCents},
        notes = ${data.notes ?? null},
        status = ${data.status ?? "scheduled"},
        assigned_to_user_id = ${assigneeIds[0] ?? null}
      where id = ${data.id} and cleaner_user_id = ${context.userId}
    `;
    await replaceJobAssignees(sql, data.id, assigneeIds);
    const hits = await findConflicts(sql, context.userId, start, data.durationMin, data.id, assigneeIds);
    return { ok: true, conflictCount: hits.length };
  });

export const assignJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; assignedToUserIds: string[]; scope: "visit" | "client_recurring" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const rows = await sql<{ id: string; client_id: string }>`
      select id, client_id from jobs where id = ${data.id} and cleaner_user_id = ${context.userId} limit 1
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
  .validator((input: { id: string; status: "scheduled" | "cancelled"; reason?: string; series?: boolean }) => input)
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
    if (data.series && job.series_id && actor.kind === "cleaner") {
      await sql`
        update jobs set status = ${data.status}, cancel_reason = ${data.reason ?? null}
        where series_id = ${job.series_id} and cleaner_user_id = ${ownerId}
          and start_at >= ${job.start_at}::timestamptz
      `;
    } else {
      await sql`
        update jobs set status = ${data.status}, cancel_reason = ${data.reason ?? null}
        where id = ${data.id} and cleaner_user_id = ${ownerId}
      `;
    }
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
