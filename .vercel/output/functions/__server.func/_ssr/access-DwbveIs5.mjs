import { t as TSS_SERVER_FUNCTION } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/access-DwbveIs5.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var PROFILE_COLUMNS = `
  user_id, role, full_name, business_name, phone, email, address, cancellation_policy,
  default_duration_min, default_rate_cents, cleaner_kind, master_user_id, can_message,
  team_status, team_messaging_enabled, plan_status, plan_price_cents,
  created_at::text as created_at
`;
var JOB_SELECT = `
  j.id, j.cleaner_user_id, j.client_id, j.service, j.address,
  j.start_at::text as start_at, j.duration_min, j.price_cents, j.notes, j.status,
  j.recurrence, j.series_id, j.cancel_reason, j.reschedule_note,
  j.reschedule_requested_at::text as reschedule_requested_at,
  j.assigned_to_user_id, j.tip_cents, j.tip_requested, j.created_at::text as created_at,
  c.name as client_name, c.phone as client_phone,
  assignee.full_name as assignee_name,
  (select coalesce(json_agg(json_build_object('user_id', p.user_id, 'full_name', p.full_name) order by p.full_name), '[]'::json)
     from job_assignees ja join profiles p on p.user_id = ja.user_id
     where ja.job_id = j.id) as assignees_json,
  (select i.status from invoices i
     where i.job_id = j.id and i.kind = 'visit'
     order by case when i.status = 'paid' then 0 else 1 end, i.created_at desc
     limit 1) as payment_status
`;
var JOB_FROM = `
  jobs j
  join clients c on c.id = j.client_id
  left join profiles assignee on assignee.user_id = j.assigned_to_user_id
`;
function asBool(v, fallback = false) {
	if (v === true || v === "t" || v === "true") return true;
	if (v === false || v === "f" || v === "false") return false;
	return fallback;
}
function normalizeProfile(row) {
	return {
		...row,
		can_message: asBool(row.can_message, true),
		team_messaging_enabled: asBool(row.team_messaging_enabled, true),
		cleaner_kind: row.cleaner_kind || (row.role === "cleaner" ? "master" : null),
		plan_status: row.plan_status || "trial",
		plan_price_cents: Number(row.plan_price_cents || 1900)
	};
}
async function getActor(sql, userId) {
	const raw = (await sql.query(`select ${PROFILE_COLUMNS} from profiles where user_id = $1 limit 1`, [userId]))[0];
	if (!raw) return {
		kind: "none",
		userId
	};
	const profile = normalizeProfile(raw);
	if (profile.role === "cleaner") {
		if (profile.cleaner_kind === "team" || profile.master_user_id) {
			const masterId = profile.master_user_id || userId;
			const accountMsg = asBool((await sql.query(`select team_messaging_enabled from profiles where user_id = $1 limit 1`, [masterId]))[0]?.team_messaging_enabled, true);
			return {
				kind: "team",
				userId,
				profile,
				masterUserId: masterId,
				canMessage: asBool(profile.can_message, true) && accountMsg,
				disabled: profile.team_status === "disabled"
			};
		}
		return {
			kind: "cleaner",
			userId,
			profile,
			masterUserId: userId
		};
	}
	const client = (await sql`
    select id, cleaner_user_id, linked_user_id, name, phone, email, address,
           access_notes, pets, supplies, default_price_cents, default_duration_min,
           usual_day, usual_time, frequency, notes, created_at::text as created_at
    from clients where linked_user_id = ${userId} limit 1
  `)[0];
	if (!client) return {
		kind: "client_unlinked",
		userId,
		profile
	};
	const cleaner = await sql`
    select full_name, business_name from profiles where user_id = ${client.cleaner_user_id} limit 1
  `;
	return {
		kind: "client",
		userId,
		profile,
		client,
		cleanerName: cleaner[0]?.business_name || cleaner[0]?.full_name || "Your cleaner"
	};
}
function assertCleaner(actor) {
	if (actor.kind !== "cleaner") throw new Error("This action is only available to the account owner.");
}
function assertStaff(actor) {
	if (actor.kind === "team" && actor.disabled) throw new Error("This team login is disabled.");
	if (actor.kind !== "cleaner" && actor.kind !== "team") throw new Error("This action is only available to cleaners.");
}
function assertClient(actor) {
	if (actor.kind !== "client") throw new Error("This action is only available to clients.");
}
function masterUserId(actor) {
	if (actor.kind === "cleaner") return actor.masterUserId;
	if (actor.kind === "team") return actor.masterUserId;
	if (actor.kind === "client") return actor.client.cleaner_user_id;
	throw new Error("No business account on this login.");
}
function canMessageClients(actor) {
	if (actor.kind === "cleaner") return true;
	if (actor.kind === "team") return actor.canMessage && !actor.disabled;
	return actor.kind === "client";
}
//#endregion
export { assertClient as a, createServerRpc as c, assertCleaner as i, getActor as l, JOB_SELECT as n, assertStaff as o, PROFILE_COLUMNS as r, canMessageClients as s, JOB_FROM as t, masterUserId as u };
