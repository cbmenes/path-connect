import type { Sql } from "@/lib/db";
import { addDaysChicago, addMinutes, startOfChicagoDay } from "./time";
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

/** Accepted team and Admins, plus saved people whose invite is not accepted yet. */
export async function queryAssignableStaff(sql: Sql, ownerId: string) {
  return sql.query<{ user_id: string; full_name: string }>(
    `select user_id, full_name from (
       select user_id, full_name, 0 as sort_pending
       from profiles
       where master_user_id = $1
         and coalesce(team_status, 'active') = 'active'
         and coalesce(cleaner_kind, 'team') in ('team', 'admin')
       union all
       select id as user_id,
              case when invited_at is null then name || ' · Saved' else name || ' · Invite pending' end as full_name,
              1 as sort_pending
       from team_invites
       where master_user_id = $1
         and accepted_at is null
         and coalesce(invite_kind, 'team') in ('team', 'admin')
     ) people
     order by sort_pending, full_name`,
    [ownerId],
  );
}

/** Keep only people on this account. Invite ids stay assignable before anyone accepts. */
export async function partitionAssignees(sql: Sql, ownerId: string, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return { profileIds: [] as string[], inviteIds: [] as string[], ordered: [] as string[] };
  const placeholders = unique.map((_, i) => `$${i + 2}`).join(", ");
  const profiles = await sql.query<{ user_id: string }>(
    `select user_id from profiles
     where master_user_id = $1
       and user_id in (${placeholders})
       and coalesce(team_status, 'active') = 'active'
       and coalesce(cleaner_kind, 'team') in ('team', 'admin')`,
    [ownerId, ...unique],
  );
  const invites = await sql.query<{ id: string }>(
    `select id from team_invites
     where master_user_id = $1
       and id in (${placeholders})
       and accepted_at is null
       and coalesce(invite_kind, 'team') in ('team', 'admin')`,
    [ownerId, ...unique],
  );
  const profileSet = new Set(profiles.map((row) => row.user_id));
  const inviteSet = new Set(invites.map((row) => row.id));
  const ordered = unique.filter((id) => profileSet.has(id) || inviteSet.has(id));
  return {
    profileIds: ordered.filter((id) => profileSet.has(id)),
    inviteIds: ordered.filter((id) => inviteSet.has(id)),
    ordered,
  };
}

/** Profile assignees plus saved people assigned to the household before they accept. */
export async function inheritedAssigneeIds(sql: Sql, clientId: string) {
  const profiles = await getClientAssigneeIds(sql, clientId);
  const invites = await sql<{ invite_id: string }>`
    select ica.invite_id
    from invite_client_assignees ica
    join team_invites i on i.id = ica.invite_id
    where ica.client_id = ${clientId} and i.accepted_at is null
  `;
  return [...profiles, ...invites.map((row) => row.invite_id)];
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

export async function replaceInviteAssigneesForClient(
  sql: Sql,
  ownerId: string,
  clientId: string,
  inviteIds: string[],
) {
  const owned = await sql<{ id: string }>`
    select id from team_invites
    where master_user_id = ${ownerId}
      and accepted_at is null
      and coalesce(invite_kind, 'team') in ('team', 'admin')
  `;
  const allowed = new Set(owned.map((row) => row.id));
  const next = [...new Set(inviteIds.filter((id) => allowed.has(id)))];
  await sql`
    delete from invite_client_assignees
    where client_id = ${clientId}
      and invite_id in (select id from team_invites where master_user_id = ${ownerId})
  `;
  for (const inviteId of next) {
    await sql`
      insert into invite_client_assignees (invite_id, client_id)
      values (${inviteId}, ${clientId})
      on conflict do nothing
    `;
  }
}

export async function replaceClientAssignmentsForInvite(sql: Sql, ownerId: string, inviteId: string, clientIds: string[]) {
  const owned = await sql<{ id: string }>`
    select id from clients where cleaner_user_id = ${ownerId}
  `;
  const allowed = new Set(owned.map((row) => row.id));
  const next = [...new Set(clientIds.filter((id) => allowed.has(id)))];
  await sql`delete from invite_client_assignees where invite_id = ${inviteId}`;
  for (const clientId of next) {
    await sql`
      insert into invite_client_assignees (invite_id, client_id)
      values (${inviteId}, ${clientId})
      on conflict do nothing
    `;
  }
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

export type AssignmentWhen = "current" | "future" | "both";

export function parseAssignmentWhen(raw: unknown): AssignmentWhen {
  if (raw === "current" || raw === "future" || raw === "both") return raw;
  throw new Error("Choose current appointments, future appointments, or both.");
}

/** Past visits (already ended) are never included. Current is the rest of today, including a visit still in progress. */
export function visitInAssignmentWindow(start: Date, durationMin: number, when: AssignmentWhen, now = new Date()) {
  if (Number.isNaN(start.getTime())) return false;
  const end = addMinutes(start, Math.max(0, Number(durationMin) || 0));
  if (end.getTime() <= now.getTime()) return false;
  if (when === "both") return true;
  const tomorrow = addDaysChicago(startOfChicagoDay(now), 1);
  if (when === "future") return start.getTime() >= tomorrow.getTime();
  return start.getTime() < tomorrow.getTime();
}

export type OpenVisit = {
  id: string;
  client_id: string;
  start_at: string;
  duration_min: number;
};

export async function listOpenVisitsForClients(sql: Sql, ownerId: string, clientIds: string[]) {
  const unique = [...new Set(clientIds.filter(Boolean))];
  if (!unique.length) return [] as OpenVisit[];
  const placeholders = unique.map((_, i) => `$${i + 2}`).join(", ");
  return sql.query<OpenVisit>(
    `select id, client_id, start_at::text as start_at, duration_min
     from jobs
     where cleaner_user_id = $1
       and client_id in (${placeholders})
       and status in ('scheduled', 'reschedule_requested')`,
    [ownerId, ...unique],
  );
}

export function visitsInWindow(visits: OpenVisit[], when: AssignmentWhen, now = new Date()) {
  return visits.filter((visit) =>
    visitInAssignmentWindow(new Date(visit.start_at), Number(visit.duration_min), when, now),
  );
}

export async function addPersonToJob(sql: Sql, jobId: string, userId: string) {
  await sql`
    insert into job_assignees (job_id, user_id) values (${jobId}, ${userId})
    on conflict do nothing
  `;
  await sql`
    update jobs set assigned_to_user_id = coalesce(assigned_to_user_id, ${userId})
    where id = ${jobId}
  `;
}

export async function removePersonFromJob(sql: Sql, jobId: string, userId: string) {
  await sql`delete from job_assignees where job_id = ${jobId} and user_id = ${userId}`;
  const jobs = await sql<{ assigned_to_user_id: string | null }>`
    select assigned_to_user_id from jobs where id = ${jobId} limit 1
  `;
  if (jobs[0]?.assigned_to_user_id !== userId) return;
  const next = await sql<{ user_id: string }>`
    select user_id from job_assignees where job_id = ${jobId} limit 1
  `;
  await sql`update jobs set assigned_to_user_id = ${next[0]?.user_id ?? null} where id = ${jobId}`;
}

export async function replaceProfileClientLinks(sql: Sql, ownerId: string, userId: string, clientIds: string[]) {
  const owned = await sql<{ id: string }>`
    select id from clients where cleaner_user_id = ${ownerId}
  `;
  const allowed = new Set(owned.map((row) => row.id));
  const next = [...new Set(clientIds.filter((id) => allowed.has(id)))];
  await sql`
    delete from client_assignees
    where user_id = ${userId}
      and client_id in (select id from clients where cleaner_user_id = ${ownerId})
  `;
  for (const clientId of next) {
    await sql`
      insert into client_assignees (client_id, user_id) values (${clientId}, ${userId})
      on conflict do nothing
    `;
  }
  return next;
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
