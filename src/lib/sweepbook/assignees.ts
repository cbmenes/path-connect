import type { Sql } from "@/lib/db";
import type { AssigneeRef, JobWithClient } from "./types";

export function parseAssignees(raw: unknown): AssigneeRef[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is AssigneeRef => Boolean(x) && typeof x === "object" && "user_id" in (x as object));
  }
  if (typeof raw === "string") {
    try {
      return parseAssignees(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function hydrateJob(row: JobWithClient & { assignees_json?: unknown }): JobWithClient {
  const assignees = parseAssignees(row.assignees_json);
  const assignee_name = assignees.map((a) => a.full_name).join(", ") || row.assignee_name || null;
  const { assignees_json: _ignored, ...rest } = row;
  return {
    ...rest,
    assignees,
    assignee_name,
    payment_status: rest.payment_status ?? null,
    progress_status: rest.progress_status ?? null,
    on_the_way_at: rest.on_the_way_at ?? null,
    started_at: rest.started_at ?? null,
    finished_at: rest.finished_at ?? null,
    checklist_template_id: rest.checklist_template_id ?? null,
  };
}

/** Team cleaners must never receive client prices, tips, or payment status. */
export function redactJobMoney(job: JobWithClient): JobWithClient {
  return {
    ...job,
    price_cents: 0,
    tip_cents: 0,
    tip_requested: false,
    payment_status: null,
    payment_paid_at: null,
    payment_method: null,
    payment_note: null,
  };
}

export async function getClientAssigneeIds(sql: Sql, clientId: string) {
  const rows = await sql<{ user_id: string }>`
    select user_id from client_assignees where client_id = ${clientId}
  `;
  return rows.map((r) => r.user_id);
}

export async function getJobAssigneeIds(sql: Sql, jobId: string) {
  const rows = await sql<{ user_id: string }>`
    select user_id from job_assignees where job_id = ${jobId}
  `;
  return rows.map((r) => r.user_id);
}

export async function replaceJobAssignees(sql: Sql, jobId: string, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await sql`delete from job_assignees where job_id = ${jobId}`;
  for (const userId of unique) {
    await sql`
      insert into job_assignees (job_id, user_id) values (${jobId}, ${userId})
      on conflict do nothing
    `;
  }
  await sql`update jobs set assigned_to_user_id = ${unique[0] ?? null} where id = ${jobId}`;
}

export async function replaceClientAssignees(sql: Sql, clientId: string, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await sql`delete from client_assignees where client_id = ${clientId}`;
  for (const userId of unique) {
    await sql`
      insert into client_assignees (client_id, user_id) values (${clientId}, ${userId})
      on conflict do nothing
    `;
  }
  return unique;
}

export async function applyAssigneesToClientRecurring(sql: Sql, clientId: string, userIds: string[]) {
  const jobs = await sql<{ id: string }>`
    select id from jobs
    where client_id = ${clientId}
      and status in ('scheduled', 'reschedule_requested')
      and start_at >= now()
      and recurrence <> 'none'
  `;
  for (const job of jobs) {
    await replaceJobAssignees(sql, job.id, userIds);
  }
}

export async function teamCanAccessClient(sql: Sql, teamUserId: string, clientId: string) {
  const rows = await sql`
    select 1 from client_assignees
    where client_id = ${clientId} and user_id = ${teamUserId}
    limit 1
  `;
  if (rows[0]) return true;
  const jobs = await sql`
    select 1 from job_assignees ja
    join jobs j on j.id = ja.job_id
    where j.client_id = ${clientId} and ja.user_id = ${teamUserId}
    limit 1
  `;
  return Boolean(jobs[0]);
}

export async function teamCanAccessJob(sql: Sql, teamUserId: string, jobId: string) {
  const rows = await sql`
    select 1 from job_assignees where job_id = ${jobId} and user_id = ${teamUserId} limit 1
  `;
  return Boolean(rows[0]);
}

export async function addMemberToClient(sql: Sql, clientId: string, userId: string) {
  await sql`
    insert into client_assignees (client_id, user_id) values (${clientId}, ${userId})
    on conflict do nothing
  `;
  const jobs = await sql<{ id: string }>`
    select id from jobs
    where client_id = ${clientId}
      and status in ('scheduled', 'reschedule_requested')
      and start_at >= now()
      and recurrence <> 'none'
  `;
  for (const job of jobs) {
    await sql`
      insert into job_assignees (job_id, user_id) values (${job.id}, ${userId})
      on conflict do nothing
    `;
    await sql`
      update jobs set assigned_to_user_id = coalesce(assigned_to_user_id, ${userId})
      where id = ${job.id}
    `;
  }
}

export async function removeMemberFromClient(sql: Sql, clientId: string, userId: string) {
  await sql`delete from client_assignees where client_id = ${clientId} and user_id = ${userId}`;
  await sql`
    delete from job_assignees
    where user_id = ${userId}
      and job_id in (
        select id from jobs
        where client_id = ${clientId}
          and status in ('scheduled', 'reschedule_requested')
          and start_at >= now()
          and recurrence <> 'none'
      )
  `;
  const jobs = await sql<{ id: string; assigned_to_user_id: string | null }>`
    select id, assigned_to_user_id from jobs
    where client_id = ${clientId} and assigned_to_user_id = ${userId}
  `;
  for (const job of jobs) {
    const next = await sql<{ user_id: string }>`
      select user_id from job_assignees where job_id = ${job.id} limit 1
    `;
    await sql`update jobs set assigned_to_user_id = ${next[0]?.user_id ?? null} where id = ${job.id}`;
  }
}
