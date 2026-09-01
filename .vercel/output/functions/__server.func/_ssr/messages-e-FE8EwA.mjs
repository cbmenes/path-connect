import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, l as getActor, s as canMessageClients } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
import { u as teamCanAccessClient } from "./assignees-nQ-loMsf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messages-e-FE8EwA.js
var TEAM_CLIENT_ACCESS = `
  (
    exists (select 1 from client_assignees ca where ca.client_id = c.id and ca.user_id = $2)
    or exists (
      select 1 from job_assignees ja
      join jobs j on j.id = ja.job_id
      where j.client_id = c.id and ja.user_id = $2
    )
  )
`;
var TEAM_MSG_ACCESS = `
  (
    exists (select 1 from client_assignees ca where ca.client_id = m.client_id and ca.user_id = $2)
    or exists (
      select 1 from job_assignees ja
      join jobs j on j.id = ja.job_id
      where j.client_id = m.client_id and ja.user_id = $2
    )
  )
`;
var listThreads_createServerFn_handler = createServerRpc({
	id: "73f84e483a243efcd29e7d12213f606f7030a8db906f77fd84996eaa2f4b3421",
	name: "listThreads",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => listThreads.__executeServer(opts));
var listThreads = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listThreads_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") return sql.query(`select c.id as client_id, c.name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, c.created_at::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         left join lateral (
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
           and last.body is not null
         order by last.created_at desc`, [context.userId]);
	if (actor.kind === "team") {
		if (!canMessageClients(actor)) return [];
		return sql.query(`select c.id as client_id, c.name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, c.created_at::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         left join lateral (
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
           and last.body is not null
           and ${TEAM_CLIENT_ACCESS}
         order by last.created_at desc`, [actor.masterUserId, context.userId]);
	}
	if (actor.kind === "client") return sql.query(`select c.id as client_id, p.business_name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, now()::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         join profiles p on p.user_id = c.cleaner_user_id
         left join lateral (
           select body, created_at from messages
           where client_id = c.id order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages
           where client_id = c.id and sender_role = 'cleaner' and read_at is null
         ) u on true
         where c.id = $1`, [actor.client.id]);
	return [];
});
var listMessageRecipients_createServerFn_handler = createServerRpc({
	id: "cf91507584cba074aae17550167ebd8c5bffed211a691ab9eb83ee35d64bb52a",
	name: "listMessageRecipients",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => listMessageRecipients.__executeServer(opts));
var listMessageRecipients = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listMessageRecipients_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") return sql.query(`select id, name, coalesce(address, email, phone) as subtitle
         from clients where cleaner_user_id = $1 order by name`, [context.userId]);
	if (actor.kind === "team") {
		if (!canMessageClients(actor)) return [];
		return sql.query(`select c.id, c.name, coalesce(c.address, c.email, c.phone) as subtitle
         from clients c
         where c.cleaner_user_id = $1 and ${TEAM_CLIENT_ACCESS}
         order by c.name`, [actor.masterUserId, context.userId]);
	}
	if (actor.kind === "client") return [{
		id: actor.client.id,
		name: actor.cleanerName,
		subtitle: "Your cleaner"
	}];
	return [];
});
var unreadMessageCount_createServerFn_handler = createServerRpc({
	id: "c5d460359ad5242b0aa81b7565f9f50766e2611300907d762ce49b796e055887",
	name: "unreadMessageCount",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => unreadMessageCount.__executeServer(opts));
var unreadMessageCount = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(unreadMessageCount_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") {
		const rows = await sql`
        select count(*)::int as n from messages
        where cleaner_user_id = ${context.userId} and sender_role = 'client' and read_at is null
      `;
		return Number(rows[0]?.n || 0);
	}
	if (actor.kind === "team" && canMessageClients(actor)) {
		const rows = await sql.query(`select count(*)::int as n from messages m
         where m.cleaner_user_id = $1 and m.sender_role = 'client' and m.read_at is null
           and ${TEAM_MSG_ACCESS}`, [actor.masterUserId, context.userId]);
		return Number(rows[0]?.n || 0);
	}
	if (actor.kind === "client") {
		const rows = await sql`
        select count(*)::int as n from messages
        where client_id = ${actor.client.id} and sender_role = 'cleaner' and read_at is null
      `;
		return Number(rows[0]?.n || 0);
	}
	return 0;
});
var getNavBadges_createServerFn_handler = createServerRpc({
	id: "26e59daf5bc37bb6eb89e842a1cba268713447bf0fe2d54ce8d65df058fe67c4",
	name: "getNavBadges",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => getNavBadges.__executeServer(opts));
var getNavBadges = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getNavBadges_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	let unreadMessages = 0;
	if (actor.kind === "cleaner") {
		const rows = await sql`
        select count(*)::int as n from messages
        where cleaner_user_id = ${context.userId} and sender_role = 'client' and read_at is null
      `;
		unreadMessages = Number(rows[0]?.n || 0);
	} else if (actor.kind === "team" && canMessageClients(actor)) {
		const rows = await sql.query(`select count(*)::int as n from messages m
         where m.cleaner_user_id = $1 and m.sender_role = 'client' and m.read_at is null
           and ${TEAM_MSG_ACCESS}`, [actor.masterUserId, context.userId]);
		unreadMessages = Number(rows[0]?.n || 0);
	} else if (actor.kind === "client") {
		const rows = await sql`
        select count(*)::int as n from messages
        where client_id = ${actor.client.id} and sender_role = 'cleaner' and read_at is null
      `;
		unreadMessages = Number(rows[0]?.n || 0);
	}
	const notes = await sql`
      select count(*)::int as n from notifications
      where user_id = ${context.userId} and status = 'unread'
    `;
	return {
		unreadMessages,
		unreadNotifications: Number(notes[0]?.n || 0)
	};
});
var getThread_createServerFn_handler = createServerRpc({
	id: "e3a6600e255c75b129276fc647d1d86f4fdc324d204115266d754271f2867f8e",
	name: "getThread",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => getThread.__executeServer(opts));
var getThread = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(getThread_createServerFn_handler, async ({ context, data: clientId }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") {
		const owned = await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${context.userId} limit 1`;
		if (!owned[0]) throw new Error("Thread not found.");
		await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and cleaner_user_id = ${context.userId}
          and sender_role = 'client' and read_at is null
      `;
		const messages = await sql`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId} and cleaner_user_id = ${context.userId}
        order by created_at asc
      `;
		return {
			title: owned[0].name,
			messages,
			clientId
		};
	}
	if (actor.kind === "team") {
		if (!canMessageClients(actor)) throw new Error("Messaging is turned off for your login.");
		if (!await teamCanAccessClient(sql, context.userId, clientId)) throw new Error("Thread not found.");
		const owned = await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${actor.masterUserId} limit 1`;
		if (!owned[0]) throw new Error("Thread not found.");
		await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and cleaner_user_id = ${actor.masterUserId}
          and sender_role = 'client' and read_at is null
      `;
		const messages = await sql`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId} and cleaner_user_id = ${actor.masterUserId}
        order by created_at asc
      `;
		return {
			title: owned[0].name,
			messages,
			clientId
		};
	}
	if (actor.kind === "client") {
		if (actor.client.id !== clientId) throw new Error("Thread not found.");
		await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and sender_role = 'cleaner' and read_at is null
      `;
		const messages = await sql`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId}
        order by created_at asc
      `;
		return {
			title: actor.cleanerName,
			messages,
			clientId
		};
	}
	throw new Error("Thread not found.");
});
var sendMessage_createServerFn_handler = createServerRpc({
	id: "3abf21788e59a584b1efa329b4afb58bc4e123f299d9b278b08bd83d52069f26",
	name: "sendMessage",
	filename: "src/lib/sweepbook/messages.ts"
}, (opts) => sendMessage.__executeServer(opts));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input.body.trim();
	if (!body) throw new Error("Write a message first.");
	return {
		clientId: input.clientId,
		body
	};
}).handler(sendMessage_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") {
		if (!(await sql`select id from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1`)[0]) throw new Error("Client not found.");
		await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${context.userId}, ${data.clientId}, ${"cleaner"}, ${data.body})
      `;
		return { ok: true };
	}
	if (actor.kind === "team") {
		if (!canMessageClients(actor)) throw new Error("Messaging is turned off for your login.");
		if (!await teamCanAccessClient(sql, context.userId, data.clientId)) throw new Error("Thread not found.");
		await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${actor.masterUserId}, ${data.clientId}, ${"cleaner"}, ${data.body})
      `;
		return { ok: true };
	}
	if (actor.kind === "client") {
		if (actor.client.id !== data.clientId) throw new Error("Thread not found.");
		await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${actor.client.cleaner_user_id}, ${data.clientId}, ${"client"}, ${data.body})
      `;
		return { ok: true };
	}
	throw new Error("Cannot send.");
});
//#endregion
export { getNavBadges_createServerFn_handler, getThread_createServerFn_handler, listMessageRecipients_createServerFn_handler, listThreads_createServerFn_handler, sendMessage_createServerFn_handler, unreadMessageCount_createServerFn_handler };
