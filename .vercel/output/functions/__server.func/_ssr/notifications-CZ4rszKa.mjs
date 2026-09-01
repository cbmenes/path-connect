import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, l as getActor, u as masterUserId } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-CZ4rszKa.js
async function insertNotification(sql, input) {
	await sql`
    insert into notifications (
      id, user_id, kind, title, body, job_id, client_id, client_name, requested_start_at, status
    ) values (
      ${nid("ntf")}, ${input.userId}, ${input.kind}, ${input.title}, ${input.body ?? null},
      ${input.jobId ?? null}, ${input.clientId ?? null}, ${input.clientName ?? null},
      ${input.requestedStartAt ?? null}, ${"unread"}
    )
  `;
}
var listNotifications_createServerFn_handler = createServerRpc({
	id: "e60ba51f4e4938930a0f25b4300485e9b69251c9b6d8ef1ba5e2ade9da881f9d",
	name: "listNotifications",
	filename: "src/lib/sweepbook/notifications.ts"
}, (opts) => listNotifications.__executeServer(opts));
var listNotifications = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listNotifications_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	await getActor(sql, context.userId);
	return sql`
      select id, user_id, kind, title, body, job_id, client_id, client_name,
             requested_start_at::text as requested_start_at, status,
             created_at::text as created_at, handled_at::text as handled_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
});
var markNotificationsRead_createServerFn_handler = createServerRpc({
	id: "e53e8b6a2ee5f776341104e06d09eadf51468d3723b1b6c8a245d06bd68522b9",
	name: "markNotificationsRead",
	filename: "src/lib/sweepbook/notifications.ts"
}, (opts) => markNotificationsRead.__executeServer(opts));
var markNotificationsRead = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input ?? {}).handler(markNotificationsRead_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	if (data.id) await sql`
        update notifications set status = 'read'
        where id = ${data.id} and user_id = ${context.userId} and status = 'unread'
      `;
	else await sql`
        update notifications set status = 'read'
        where user_id = ${context.userId} and status = 'unread'
      `;
	return { ok: true };
});
var handleNotification_createServerFn_handler = createServerRpc({
	id: "315bed82600e29e2cb9cd11f5c218a46deda5ae6489ecc2dc66645f9da89d999",
	name: "handleNotification",
	filename: "src/lib/sweepbook/notifications.ts"
}, (opts) => handleNotification.__executeServer(opts));
var handleNotification = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(handleNotification_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind !== "cleaner" && actor.kind !== "team") throw new Error("Only cleaners can handle these requests.");
	const n = (await sql`
      select id, user_id, kind, title, body, job_id, client_id, client_name,
             requested_start_at::text as requested_start_at, status,
             created_at::text as created_at, handled_at::text as handled_at
      from notifications where id = ${data.id} and user_id = ${context.userId} limit 1
    `)[0];
	if (!n) throw new Error("Request not found.");
	if (n.kind !== "cancel" && n.kind !== "reschedule") {
		await sql`
        update notifications set status = 'read', handled_at = now()
        where id = ${n.id}
      `;
		return { ok: true };
	}
	if (!n.job_id) throw new Error("This request has no visit attached.");
	const ownerId = masterUserId(actor);
	const job = (await sql`
      select id, status, start_at::text as start_at, assigned_to_user_id, client_id
      from jobs where id = ${n.job_id} and cleaner_user_id = ${ownerId} limit 1
    `)[0];
	if (!job) throw new Error("Visit not found.");
	const newStatus = data.action === "approve" ? "approved" : "declined";
	if (n.kind === "cancel") {
		if (data.action === "approve") await sql`update jobs set status = 'cancelled' where id = ${job.id}`;
		else await sql`update jobs set status = 'scheduled', cancel_reason = null where id = ${job.id}`;
	} else if (n.kind === "reschedule") {
		if (data.action === "approve") {
			if (n.requested_start_at) await sql`
            update jobs set status = 'scheduled', start_at = ${n.requested_start_at}::timestamptz,
              reschedule_note = null
            where id = ${job.id}
          `;
			else await sql`update jobs set status = 'scheduled' where id = ${job.id}`;
		} else await sql`
          update jobs set status = 'scheduled', reschedule_requested_at = null
          where id = ${job.id}
        `;
	}
	await sql`
      update notifications set status = ${newStatus}, handled_at = now()
      where id = ${n.id}
    `;
	await sql`
      update notifications set status = ${newStatus}, handled_at = now()
      where job_id = ${job.id} and kind = ${n.kind} and status in ('unread', 'read')
    `;
	const linked = await sql`
      select linked_user_id, name from clients where id = ${job.client_id} limit 1
    `;
	const clientUser = linked[0]?.linked_user_id;
	if (clientUser) {
		const approved = data.action === "approve";
		await insertNotification(sql, {
			userId: clientUser,
			kind: approved ? "request_approved" : "request_declined",
			title: approved ? n.kind === "cancel" ? "Your cancellation was accepted" : "Your reschedule was accepted" : n.kind === "cancel" ? "Your cancellation was declined — the visit stays on the book" : "Your reschedule was declined — the original time stays",
			body: n.kind === "reschedule" && approved && n.requested_start_at ? "The new time is confirmed." : null,
			jobId: job.id,
			clientId: job.client_id,
			clientName: linked[0]?.name ?? null,
			requestedStartAt: n.requested_start_at
		});
	}
	return { ok: true };
});
//#endregion
export { handleNotification_createServerFn_handler, listNotifications_createServerFn_handler, markNotificationsRead_createServerFn_handler };
