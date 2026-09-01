import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { _ as startOfChicagoDay, h as partsInChicago, r as chicagoDate, t as addDaysChicago } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, l as getActor, n as JOB_SELECT, t as JOB_FROM } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
import { i as hydrateJob, o as redactJobMoney } from "./assignees-nQ-loMsf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-CqKPsJY7.js
var getDashboard_createServerFn_handler = createServerRpc({
	id: "5d238c6b56915ee2e83d3ef706b2badf9149e9d22d9ec36ab5a38c425524cdbd",
	name: "getDashboard",
	filename: "src/lib/sweepbook/dashboard.ts"
}, (opts) => getDashboard.__executeServer(opts));
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getDashboard_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	const start = startOfChicagoDay(/* @__PURE__ */ new Date());
	const endToday = addDaysChicago(start, 1);
	const endWeek = addDaysChicago(start, 7);
	if (actor.kind === "cleaner") {
		const today = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`, [
			context.userId,
			start.toISOString(),
			endToday.toISOString()
		]).then((rows) => rows.map(hydrateJob));
		const week = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`, [
			context.userId,
			start.toISOString(),
			endWeek.toISOString()
		]).then((rows) => rows.map(hydrateJob));
		const unpaid = await sql.query(`select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name
         from invoices i join clients c on c.id = i.client_id
         where i.cleaner_user_id = $1 and i.status in ('unpaid', 'failed')
         order by i.created_at desc`, [context.userId]);
		const threads = await sql.query(`select c.id as client_id, c.name as client_name, last.body as last_body,
                last.created_at::text as last_at, coalesce(u.unread, 0)::int as unread
         from clients c
         join lateral (
           select body, created_at from messages
           where client_id = c.id and cleaner_user_id = $1
           order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages
           where client_id = c.id and cleaner_user_id = $1
             and sender_role = 'client' and read_at is null
         ) u on true
         where c.cleaner_user_id = $1
         order by last.created_at desc
         limit 5`, [context.userId]);
		const unread = threads.reduce((n, t) => n + Number(t.unread || 0), 0);
		const failed = unpaid.filter((i) => i.status === "failed");
		const reqs = await sql`
        select count(*)::int as n from notifications
        where user_id = ${context.userId} and status in ('unread', 'read')
          and kind in ('cancel', 'reschedule')
      `;
		const p = partsInChicago(/* @__PURE__ */ new Date());
		const monthStart = chicagoDate(p.year, p.month, 1, 0, 0);
		const nextMonth = p.month === 12 ? chicagoDate(p.year + 1, 1, 1, 0, 0) : chicagoDate(p.year, p.month + 1, 1, 0, 0);
		const yearStart = chicagoDate(p.year, 1, 1, 0, 0);
		const yearEnd = chicagoDate(p.year + 1, 1, 1, 0, 0);
		const monthRows = await sql`
        select coalesce(sum(i.amount_cents), 0)::int as n
        from invoices i
        where i.cleaner_user_id = ${context.userId}
          and i.status = 'paid' and i.kind = 'visit' and i.job_id is not null
          and i.paid_at >= ${monthStart.toISOString()}::timestamptz
          and i.paid_at < ${nextMonth.toISOString()}::timestamptz
      `;
		const yearRows = await sql`
        select coalesce(sum(i.amount_cents), 0)::int as n
        from invoices i
        where i.cleaner_user_id = ${context.userId}
          and i.status = 'paid' and i.kind = 'visit' and i.job_id is not null
          and i.paid_at >= ${yearStart.toISOString()}::timestamptz
          and i.paid_at < ${yearEnd.toISOString()}::timestamptz
      `;
		const monthLabel = new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
			timeZone: "America/Chicago"
		}).format(/* @__PURE__ */ new Date());
		const ytd = Number(yearRows[0]?.n || 0);
		return {
			actor,
			today,
			week,
			unpaid,
			threads,
			unread,
			failed,
			pendingRequests: Number(reqs[0]?.n || 0),
			revenue: {
				monthCents: Number(monthRows[0]?.n || 0),
				ytdCents: ytd,
				annualCents: ytd,
				monthLabel,
				year: p.year
			}
		};
	}
	if (actor.kind === "team") {
		const today = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`, [
			actor.masterUserId,
			context.userId,
			start.toISOString(),
			endToday.toISOString()
		]).then((rows) => rows.map(hydrateJob).map(redactJobMoney));
		const week = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`, [
			actor.masterUserId,
			context.userId,
			start.toISOString(),
			endWeek.toISOString()
		]).then((rows) => rows.map(hydrateJob).map(redactJobMoney));
		const unreadRows = await sql.query(`select count(*)::int as n from messages m
         where m.cleaner_user_id = $1 and m.sender_role = 'client' and m.read_at is null
           and (
             exists (select 1 from client_assignees ca where ca.client_id = m.client_id and ca.user_id = $2)
             or exists (
               select 1 from job_assignees ja
               join jobs j on j.id = ja.job_id
               where j.client_id = m.client_id and ja.user_id = $2
             )
           )`, [actor.masterUserId, context.userId]);
		const reqs = await sql`
        select count(*)::int as n from notifications
        where user_id = ${context.userId} and status in ('unread', 'read')
          and kind in ('cancel', 'reschedule')
      `;
		return {
			actor,
			today,
			week,
			unread: Number(unreadRows[0]?.n || 0),
			pendingRequests: Number(reqs[0]?.n || 0)
		};
	}
	if (actor.kind === "client") {
		const upcoming = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and j.start_at >= $2::timestamptz and j.status in ('scheduled', 'reschedule_requested')
         order by j.start_at asc
         limit 12`, [actor.client.id, start.toISOString()]).then((rows) => rows.map(hydrateJob));
		const past = await sql.query(`select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and (j.start_at < $2::timestamptz or j.status in ('completed', 'cancelled'))
         order by j.start_at desc
         limit 12`, [actor.client.id, start.toISOString()]).then((rows) => rows.map(hydrateJob));
		const unpaid = await sql.query(`select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name
         from invoices i join clients c on c.id = i.client_id
         where i.client_id = $1 and i.status in ('unpaid', 'failed')
         order by i.created_at desc`, [actor.client.id]);
		const cards = await sql`
        select id, brand, last4, failing, is_default from payment_cards
        where client_id = ${actor.client.id} order by is_default desc
      `;
		return {
			actor,
			upcoming,
			past,
			unpaid,
			cards,
			next: upcoming[0] ?? null,
			failedCard: unpaid.some((i) => i.status === "failed") || cards.some((c) => c.failing)
		};
	}
	return { actor };
});
var updateSettings_createServerFn_handler = createServerRpc({
	id: "52376275f87fd45176ab7c016893d22d7f4c98439eb58544a3428116c4e9ec7b",
	name: "updateSettings",
	filename: "src/lib/sweepbook/dashboard.ts"
}, (opts) => updateSettings.__executeServer(opts));
var updateSettings = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(updateSettings_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	const fullName = data.fullName.trim();
	if (!fullName) throw new Error("Name is required.");
	if (actor.kind === "cleaner") {
		await sql`
        update profiles set
          full_name = ${fullName},
          business_name = ${data.businessName?.trim() || null},
          phone = ${data.phone?.trim() || null},
          email = ${data.email?.trim() || null},
          address = ${data.address?.trim() || null},
          cancellation_policy = ${data.cancellationPolicy?.trim() || null}
        where user_id = ${context.userId}
      `;
		await sql`update "user" set name = ${fullName} where id = ${context.userId}`;
		return { ok: true };
	}
	if (actor.kind === "team") {
		await sql`
        update profiles set
          full_name = ${fullName},
          phone = ${data.phone?.trim() || null},
          email = ${data.email?.trim() || null}
        where user_id = ${context.userId}
      `;
		await sql`update "user" set name = ${fullName} where id = ${context.userId}`;
		return { ok: true };
	}
	if (actor.kind === "client") {
		await sql`
        update profiles set
          full_name = ${fullName},
          phone = ${data.phone?.trim() || null},
          email = ${data.email?.trim() || null},
          address = ${data.address?.trim() || null}
        where user_id = ${context.userId}
      `;
		await sql`update "user" set name = ${fullName} where id = ${context.userId}`;
		await sql`
        update clients set
          name = ${fullName},
          phone = ${data.phone?.trim() || null},
          email = ${data.email?.trim() || null},
          address = ${data.address?.trim() || null}
        where linked_user_id = ${context.userId}
      `;
		return { ok: true };
	}
	throw new Error("Sign in to edit settings.");
});
//#endregion
export { getDashboard_createServerFn_handler, updateSettings_createServerFn_handler };
