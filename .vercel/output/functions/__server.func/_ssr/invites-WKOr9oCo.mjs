import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, i as assertCleaner, l as getActor } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/invites-WKOr9oCo.js
var createInvite_createServerFn_handler = createServerRpc({
	id: "516df6347ee970af03cd6375d0b17f7dc8483e21f0985d201aab52d43e8c48ac",
	name: "createInvite",
	filename: "src/lib/sweepbook/invites.ts"
}, (opts) => createInvite.__executeServer(opts));
var createInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createInvite_createServerFn_handler, async ({ context, data: clientId }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const client = (await sql`
      select id, email, name from clients where id = ${clientId} and cleaner_user_id = ${context.userId} limit 1
    `)[0];
	if (!client) throw new Error("Client not found.");
	const token = nid("invite").replace(/-/g, "").slice(0, 22);
	await sql`
      insert into invites (id, token, cleaner_user_id, client_id, email)
      values (${nid("invt")}, ${token}, ${context.userId}, ${clientId}, ${client.email})
    `;
	return {
		token,
		path: `/invite/${token}`,
		email: client.email,
		name: client.name
	};
});
var getInvitePublic_createServerFn_handler = createServerRpc({
	id: "2e703d571691fb3e48e938153a3611902c1910142784d291e2dbeed31ddffc59",
	name: "getInvitePublic",
	filename: "src/lib/sweepbook/invites.ts"
}, (opts) => getInvitePublic.__executeServer(opts));
var getInvitePublic = createServerFn({ method: "GET" }).validator((token) => token).handler(getInvitePublic_createServerFn_handler, async ({ data: token }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const invite = (await sql.query(`select i.token, c.name as client_name, p.full_name as cleaner_name, p.business_name,
              i.email, i.accepted_at::text as accepted_at, i.client_id
       from invites i
       join clients c on c.id = i.client_id
       join profiles p on p.user_id = i.cleaner_user_id
       where i.token = $1 limit 1`, [token]))[0];
	if (!invite) throw new Error("This invite is invalid or expired.");
	return invite;
});
var acceptInvite_createServerFn_handler = createServerRpc({
	id: "1366dba19ae7c7571e07d9af53b4e344bdaff0662d47b2adb8ae5253e9ea0be4",
	name: "acceptInvite",
	filename: "src/lib/sweepbook/invites.ts"
}, (opts) => acceptInvite.__executeServer(opts));
var acceptInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((token) => token).handler(acceptInvite_createServerFn_handler, async ({ context, data: token }) => {
	const sql = await getSql();
	const invite = (await sql`
      select client_id, cleaner_user_id, accepted_at::text as accepted_at
      from invites where token = ${token} limit 1
    `)[0];
	if (!invite) throw new Error("This invite is invalid.");
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "none") {
		const u = (await sql`
        select name, email from "user" where id = ${context.userId} limit 1
      `)[0];
		await sql`
        insert into profiles (user_id, role, full_name)
        values (${context.userId}, ${"client"}, ${u?.name || "Client"})
        on conflict (user_id) do nothing
      `;
	} else if (actor.kind === "cleaner") throw new Error("You're signed in as a cleaner. Sign out to join as a client.");
	await sql`
      update clients set linked_user_id = ${context.userId}
      where id = ${invite.client_id} and cleaner_user_id = ${invite.cleaner_user_id}
    `;
	await sql`update invites set accepted_at = now() where token = ${token}`;
	return { ok: true };
});
var getCardLinkPublic_createServerFn_handler = createServerRpc({
	id: "258226a38f7fbe642f5f09775869f3cb6aa84a93d699d9f6f4198f8842a1fa35",
	name: "getCardLinkPublic",
	filename: "src/lib/sweepbook/invites.ts"
}, (opts) => getCardLinkPublic.__executeServer(opts));
var getCardLinkPublic = createServerFn({ method: "GET" }).validator((token) => token).handler(getCardLinkPublic_createServerFn_handler, async ({ data: token }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const link = (await sql.query(`select l.token, c.name as client_name, p.full_name as cleaner_name, p.business_name,
              l.used_at::text as used_at
       from card_links l
       join clients c on c.id = l.client_id
       join profiles p on p.user_id = l.cleaner_user_id
       where l.token = $1 limit 1`, [token]))[0];
	if (!link) throw new Error("This add-card link is invalid.");
	return link;
});
//#endregion
export { acceptInvite_createServerFn_handler, createInvite_createServerFn_handler, getCardLinkPublic_createServerFn_handler, getInvitePublic_createServerFn_handler };
