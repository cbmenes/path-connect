import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { c as fromDatetimeLocalValue, h as partsInChicago, m as nid, n as addMinutes, r as chicagoDate, t as addDaysChicago, u as hoursUntil } from "./time-DJsHuhyu.mjs";
import { a as assertClient, c as createServerRpc, i as assertCleaner, l as getActor, n as JOB_SELECT, o as assertStaff, t as JOB_FROM, u as masterUserId } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
import { c as replaceClientAssignees, d as teamCanAccessJob, i as hydrateJob, l as replaceJobAssignees, n as applyAssigneesToClientRecurring, o as redactJobMoney, r as getClientAssigneeIds } from "./assignees-nQ-loMsf.mjs";
import { n as insertNotification } from "./notifications-2GPgnREj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs-DGdkJFrc.js
var listJobs_createServerFn_handler = createServerRpc({
	id: "fc62151510a0fd5cda4c0871bb7e346047607f2f9037dce5a660696f5e4953b7",
	name: "listJobs",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => listJobs.__executeServer(opts));
var listJobs = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => input).handler(listJobs_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") return (await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
         order by j.start_at asc`, [
		context.userId,
		data.from,
		data.to
	])).map(hydrateJob);
	if (actor.kind === "team") {
		if (actor.disabled) return [];
		return (await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
         order by j.start_at asc`, [
			actor.masterUserId,
			context.userId,
			data.from,
			data.to
		])).map(hydrateJob).map(redactJobMoney);
	}
	if (actor.kind === "client") return (await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
         order by j.start_at asc`, [
		actor.client.id,
		data.from,
		data.to
	])).map(hydrateJob);
	return [];
});
var getJob_createServerFn_handler = createServerRpc({
	id: "af23d6711cefac0c80f5b3a98023d7ae127cbd3ad6514e58f9f94a920a32fc93",
	name: "getJob",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => getJob.__executeServer(opts));
var getJob = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(getJob_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	const rows = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM} where j.id = $1 limit 1`, [id]);
	const job = rows[0] ? hydrateJob(rows[0]) : null;
	if (!job) throw new Error("Visit not found.");
	if (actor.kind === "cleaner" && job.cleaner_user_id !== context.userId) throw new Error("Visit not found.");
	if (actor.kind === "team") {
		if (actor.disabled || job.cleaner_user_id !== actor.masterUserId) throw new Error("Visit not found.");
		if (!await teamCanAccessJob(sql, context.userId, job.id)) throw new Error("Visit not found.");
	}
	if (actor.kind === "client" && job.client_id !== actor.client.id) throw new Error("Visit not found.");
	if (actor.kind === "none" || actor.kind === "client_unlinked") throw new Error("Visit not found.");
	const visible = actor.kind === "team" ? redactJobMoney(job) : job;
	const policy = actor.kind === "cleaner" ? actor.profile.cancellation_policy : (await sql`
              select cancellation_policy from profiles where user_id = ${job.cleaner_user_id} limit 1
            `)[0]?.cancellation_policy;
	const staff = await sql`
      select user_id, full_name from profiles
      where master_user_id = ${job.cleaner_user_id} and coalesce(team_status, 'active') = 'active'
      order by full_name
    `;
	return {
		job: visible,
		cancellationPolicy: policy ?? null,
		hoursUntil: hoursUntil(job.start_at),
		staff
	};
});
function parseJobInput(input) {
	if (!input.clientId) throw new Error("Choose a client.");
	if (!input.startLocal) throw new Error("Choose a date and time.");
	const durationMin = Number(input.durationMin);
	const priceCents = Number(input.priceCents);
	if (!durationMin || durationMin < 30) throw new Error("Duration must be at least 0.5 hours.");
	if (priceCents < 0) throw new Error("Price cannot be negative.");
	const recurrence = input.recurrence || "none";
	let assignedToUserIds;
	if (Array.isArray(input.assignedToUserIds)) assignedToUserIds = input.assignedToUserIds.filter(Boolean);
	else if (input.assignedToUserId) assignedToUserIds = [input.assignedToUserId];
	return {
		clientId: input.clientId,
		service: input.service.trim() || "House cleaning",
		address: input.address?.trim() || void 0,
		startLocal: input.startLocal,
		durationMin,
		priceCents,
		notes: input.notes?.trim() || void 0,
		recurrence,
		assignedToUserIds
	};
}
async function loadAssigneeMap(sql, jobIds) {
	const map = /* @__PURE__ */ new Map();
	if (!jobIds.length) return map;
	const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
	const rows = await sql.query(`select job_id, user_id from job_assignees where job_id in (${placeholders})`, jobIds);
	for (const row of rows) {
		const list = map.get(row.job_id) ?? [];
		list.push(row.user_id);
		map.set(row.job_id, list);
	}
	return map;
}
function assigneesOverlap(a, b) {
	if (!a.length && !b.length) return true;
	if (!a.length || !b.length) return false;
	return a.some((id) => b.includes(id));
}
async function findConflicts(sql, cleanerId, start, durationMin, ignoreId, assignedTo) {
	const end = addMinutes(start, durationMin);
	const windowStart = addMinutes(start, -480);
	const windowEnd = addMinutes(end, 480);
	const nearby = await sql.query(`select id, start_at::text as start_at, duration_min, status, assigned_to_user_id
     from jobs
     where cleaner_user_id = $1
       and status in ('scheduled', 'reschedule_requested')
       and start_at >= $2::timestamptz and start_at < $3::timestamptz
       ${ignoreId ? "and id <> $4" : ""}`, ignoreId ? [
		cleanerId,
		windowStart.toISOString(),
		windowEnd.toISOString(),
		ignoreId
	] : [
		cleanerId,
		windowStart.toISOString(),
		windowEnd.toISOString()
	]);
	const asg = await loadAssigneeMap(sql, nearby.map((j) => j.id));
	const mine = assignedTo?.filter(Boolean) ?? [];
	return nearby.filter((j) => {
		const theirs = asg.get(j.id) ?? (j.assigned_to_user_id ? [j.assigned_to_user_id] : []);
		if (!assigneesOverlap(mine, theirs)) return false;
		const js = new Date(j.start_at);
		return start < addMinutes(js, j.duration_min) && js < end;
	});
}
function occurrenceStarts(first, recurrence) {
	if (recurrence === "none") return [first];
	const stepDays = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 28;
	const count = recurrence === "monthly" ? 12 : 26;
	const p0 = partsInChicago(first);
	const out = [];
	for (let i = 0; i < count; i++) {
		const day = addDaysChicago(first, i * stepDays);
		const p = partsInChicago(day);
		out.push(chicagoDate(p.year, p.month, p.day, p0.hour, p0.minute));
	}
	return out;
}
async function notifyAssignees(sql, userIds, clientId, clientName, jobId, body) {
	for (const userId of userIds) await insertNotification(sql, {
		userId,
		kind: "job_assigned",
		title: `Assigned: ${clientName}`,
		body: body ?? "A visit was assigned to you.",
		jobId: jobId ?? null,
		clientId,
		clientName
	});
}
var checkJobConflicts_createServerFn_handler = createServerRpc({
	id: "b8e46d292b03e42744b5068c0ea32407139245836d7b20b32bf0f336ee47e115",
	name: "checkJobConflicts",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => checkJobConflicts.__executeServer(opts));
var checkJobConflicts = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(checkJobConflicts_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const start = fromDatetimeLocalValue(data.startLocal);
	return { conflicts: (await findConflicts(sql, context.userId, start, Number(data.durationMin) || 120, data.ignoreId, data.assignedToUserIds)).map((h) => ({
		id: h.id,
		start_at: h.start_at,
		duration_min: h.duration_min
	})) };
});
var createJob_createServerFn_handler = createServerRpc({
	id: "f81d3d33cc6c097f2f7e2fff39638e01337920eae4186ad571f79c4cb8f61f36",
	name: "createJob",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => createJob.__executeServer(opts));
var createJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseJobInput(input)).handler(createJob_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const client = (await sql`
      select id, address, name from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1
    `)[0];
	if (!client) throw new Error("Client not found.");
	const inherited = await getClientAssigneeIds(sql, data.clientId);
	const assigneeIds = data.assignedToUserIds !== void 0 ? data.assignedToUserIds : inherited;
	const starts = occurrenceStarts(fromDatetimeLocalValue(data.startLocal), data.recurrence);
	const seriesId = data.recurrence === "none" ? null : nid("series");
	const created = [];
	let conflictCount = 0;
	for (const start of starts) {
		if ((await findConflicts(sql, context.userId, start, data.durationMin, void 0, assigneeIds)).length) conflictCount += 1;
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
		created.push({
			id,
			start: start.toISOString()
		});
	}
	if (assigneeIds.length) await notifyAssignees(sql, assigneeIds, data.clientId, client.name, created[0]?.id, `${starts.length} visit${starts.length === 1 ? "" : "s"} added to your book.`);
	return {
		id: created[0]?.id,
		startAt: created[0]?.start,
		count: created.length,
		conflictCount
	};
});
var updateJob_createServerFn_handler = createServerRpc({
	id: "685d610107b2c057d16ef83f6bf21ce54bc9e879fabf75f54129aeb9242e84cb",
	name: "updateJob",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => updateJob.__executeServer(opts));
var updateJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: input.id,
	status: input.status,
	...parseJobInput(input)
})).handler(updateJob_createServerFn_handler, async ({ context, data }) => {
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
	return {
		ok: true,
		conflictCount: (await findConflicts(sql, context.userId, start, data.durationMin, data.id, assigneeIds)).length
	};
});
var assignJob_createServerFn_handler = createServerRpc({
	id: "86cdfe150f27971b8434b6e4a8b66718b39f4e0f1e94daaa3254cc704405c338",
	name: "assignJob",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => assignJob.__executeServer(opts));
var assignJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(assignJob_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const job = (await sql`
      select id, client_id from jobs where id = ${data.id} and cleaner_user_id = ${context.userId} limit 1
    `)[0];
	if (!job) throw new Error("Visit not found.");
	const ids = [...new Set((data.assignedToUserIds ?? []).filter(Boolean))];
	const clients = await sql`select name from clients where id = ${job.client_id} limit 1`;
	if (data.scope === "client_recurring") {
		await replaceClientAssignees(sql, job.client_id, ids);
		await applyAssigneesToClientRecurring(sql, job.client_id, ids);
		await replaceJobAssignees(sql, job.id, ids);
	} else await replaceJobAssignees(sql, job.id, ids);
	if (ids.length) await notifyAssignees(sql, ids, job.client_id, clients[0]?.name || "a visit", job.id, data.scope === "client_recurring" ? "You were assigned to this client's recurring visits." : "A visit was assigned to you.");
	return { ok: true };
});
var setJobStatus_createServerFn_handler = createServerRpc({
	id: "6937d268f5ece0226f2fa7a651b522cb4e19162af9effee106e4a0520e3adbfc",
	name: "setJobStatus",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => setJobStatus.__executeServer(opts));
var setJobStatus = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(setJobStatus_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertStaff(actor);
	const ownerId = masterUserId(actor);
	const job = (await sql`
      select id, series_id, start_at::text as start_at, assigned_to_user_id, client_id, price_cents, service
      from jobs
      where id = ${data.id} and cleaner_user_id = ${ownerId} limit 1
    `)[0];
	if (!job) throw new Error("Visit not found.");
	if (actor.kind === "team") throw new Error("Team cleaners cannot change visit status.");
	if (data.series && job.series_id && actor.kind === "cleaner") await sql`
        update jobs set status = ${data.status}, cancel_reason = ${data.reason ?? null}
        where series_id = ${job.series_id} and cleaner_user_id = ${ownerId}
          and start_at >= ${job.start_at}::timestamptz
      `;
	else await sql`
        update jobs set status = ${data.status}, cancel_reason = ${data.reason ?? null}
        where id = ${data.id} and cleaner_user_id = ${ownerId}
      `;
	return { ok: true };
});
var clientCancelOrReschedule_createServerFn_handler = createServerRpc({
	id: "7e554f5030f94b854809dcfbaf9612efe6663cdff71815e852f49feef1fafaee",
	name: "clientCancelOrReschedule",
	filename: "src/lib/sweepbook/jobs.ts"
}, (opts) => clientCancelOrReschedule.__executeServer(opts));
var clientCancelOrReschedule = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(clientCancelOrReschedule_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertClient(actor);
	const job = (await sql`
      select id, start_at::text as start_at, status, cleaner_user_id, assigned_to_user_id, client_id
      from jobs
      where id = ${data.id} and client_id = ${actor.client.id} limit 1
    `)[0];
	if (!job) throw new Error("Visit not found.");
	if (job.status === "cancelled" || job.status === "completed") throw new Error("This visit can no longer be changed.");
	const within24 = hoursUntil(job.start_at) < 24;
	const requested = data.requestedStart ? fromDatetimeLocalValue(data.requestedStart) : null;
	if (data.action === "cancel") await sql`
        update jobs set status = 'cancelled', cancel_reason = ${data.note ?? null}
        where id = ${data.id} and client_id = ${actor.client.id}
      `;
	else await sql`
        update jobs set
          status = 'reschedule_requested',
          reschedule_note = ${data.note ?? null},
          reschedule_requested_at = ${requested ? requested.toISOString() : null}
        where id = ${data.id} and client_id = ${actor.client.id}
      `;
	const kind = data.action === "cancel" ? "cancel" : "reschedule";
	const title = data.action === "cancel" ? `${actor.client.name} cancelled a visit` : `${actor.client.name} requested a reschedule`;
	const bodyParts = [data.note ? data.note : null].filter(Boolean);
	const recipients = /* @__PURE__ */ new Set([job.cleaner_user_id]);
	const assignees = await sql`select user_id from job_assignees where job_id = ${job.id}`;
	for (const a of assignees) recipients.add(a.user_id);
	if (job.assigned_to_user_id) recipients.add(job.assigned_to_user_id);
	for (const userId of recipients) await insertNotification(sql, {
		userId,
		kind,
		title,
		body: bodyParts.join(" · ") || null,
		jobId: job.id,
		clientId: actor.client.id,
		clientName: actor.client.name,
		requestedStartAt: requested ? requested.toISOString() : null
	});
	return {
		ok: true,
		within24
	};
});
//#endregion
export { assignJob_createServerFn_handler, checkJobConflicts_createServerFn_handler, clientCancelOrReschedule_createServerFn_handler, createJob_createServerFn_handler, getJob_createServerFn_handler, listJobs_createServerFn_handler, setJobStatus_createServerFn_handler, updateJob_createServerFn_handler };
