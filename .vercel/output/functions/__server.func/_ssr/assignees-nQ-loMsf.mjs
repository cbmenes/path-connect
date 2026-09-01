//#region node_modules/.nitro/vite/services/ssr/assets/assignees-nQ-loMsf.js
function parseAssignees(raw) {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.filter((x) => Boolean(x) && typeof x === "object" && "user_id" in x);
	if (typeof raw === "string") try {
		return parseAssignees(JSON.parse(raw));
	} catch {
		return [];
	}
	return [];
}
function hydrateJob(row) {
	const assignees = parseAssignees(row.assignees_json);
	const assignee_name = assignees.map((a) => a.full_name).join(", ") || row.assignee_name || null;
	const { assignees_json: _ignored, ...rest } = row;
	return {
		...rest,
		assignees,
		assignee_name,
		payment_status: rest.payment_status ?? null
	};
}
/** Team cleaners must never receive client prices, tips, or payment status. */
function redactJobMoney(job) {
	return {
		...job,
		price_cents: 0,
		tip_cents: 0,
		tip_requested: false,
		payment_status: null
	};
}
async function getClientAssigneeIds(sql, clientId) {
	return (await sql`
    select user_id from client_assignees where client_id = ${clientId}
  `).map((r) => r.user_id);
}
async function replaceJobAssignees(sql, jobId, userIds) {
	const unique = [...new Set(userIds.filter(Boolean))];
	await sql`delete from job_assignees where job_id = ${jobId}`;
	for (const userId of unique) await sql`
      insert into job_assignees (job_id, user_id) values (${jobId}, ${userId})
      on conflict do nothing
    `;
	await sql`update jobs set assigned_to_user_id = ${unique[0] ?? null} where id = ${jobId}`;
}
async function replaceClientAssignees(sql, clientId, userIds) {
	const unique = [...new Set(userIds.filter(Boolean))];
	await sql`delete from client_assignees where client_id = ${clientId}`;
	for (const userId of unique) await sql`
      insert into client_assignees (client_id, user_id) values (${clientId}, ${userId})
      on conflict do nothing
    `;
	return unique;
}
async function applyAssigneesToClientRecurring(sql, clientId, userIds) {
	const jobs = await sql`
    select id from jobs
    where client_id = ${clientId}
      and status in ('scheduled', 'reschedule_requested')
      and start_at >= now()
      and recurrence <> 'none'
  `;
	for (const job of jobs) await replaceJobAssignees(sql, job.id, userIds);
}
async function teamCanAccessClient(sql, teamUserId, clientId) {
	if ((await sql`
    select 1 from client_assignees
    where client_id = ${clientId} and user_id = ${teamUserId}
    limit 1
  `)[0]) return true;
	const jobs = await sql`
    select 1 from job_assignees ja
    join jobs j on j.id = ja.job_id
    where j.client_id = ${clientId} and ja.user_id = ${teamUserId}
    limit 1
  `;
	return Boolean(jobs[0]);
}
async function teamCanAccessJob(sql, teamUserId, jobId) {
	const rows = await sql`
    select 1 from job_assignees where job_id = ${jobId} and user_id = ${teamUserId} limit 1
  `;
	return Boolean(rows[0]);
}
async function addMemberToClient(sql, clientId, userId) {
	await sql`
    insert into client_assignees (client_id, user_id) values (${clientId}, ${userId})
    on conflict do nothing
  `;
	const jobs = await sql`
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
async function removeMemberFromClient(sql, clientId, userId) {
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
	const jobs = await sql`
    select id, assigned_to_user_id from jobs
    where client_id = ${clientId} and assigned_to_user_id = ${userId}
  `;
	for (const job of jobs) await sql`update jobs set assigned_to_user_id = ${(await sql`
      select user_id from job_assignees where job_id = ${job.id} limit 1
    `)[0]?.user_id ?? null} where id = ${job.id}`;
}
//#endregion
export { parseAssignees as a, replaceClientAssignees as c, teamCanAccessJob as d, hydrateJob as i, replaceJobAssignees as l, applyAssigneesToClientRecurring as n, redactJobMoney as o, getClientAssigneeIds as r, removeMemberFromClient as s, addMemberToClient as t, teamCanAccessClient as u };
