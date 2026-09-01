import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, i as assertCleaner, l as getActor, r as PROFILE_COLUMNS } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
import { s as removeMemberFromClient, t as addMemberToClient } from "./assignees-nQ-loMsf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-BcddWE0A.js
function parseClientRefs(raw) {
	if (!raw) return [];
	let arr = raw;
	if (typeof raw === "string") try {
		arr = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(arr)) return [];
	return arr.filter((x) => Boolean(x) && typeof x === "object" && "id" in x && "name" in x);
}
var listTeam_createServerFn_handler = createServerRpc({
	id: "294d13ca06b61665fea7bb95af227f7279a33b68c9b360f0d6d575caa7c26aa2",
	name: "listTeam",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => listTeam.__executeServer(opts));
var listTeam = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listTeam_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const members = await sql.query(`select user_id, full_name, phone, email, can_message, coalesce(team_status, 'active') as team_status,
              false as pending,
              (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::json)
                 from client_assignees ca join clients c on c.id = ca.client_id
                 where ca.user_id = profiles.user_id) as assigned_json
       from profiles
       where master_user_id = $1 and role = 'cleaner'
       order by full_name`, [context.userId]);
	const pending = await sql.query(`select id as user_id, name as full_name, phone, email, can_message, 'pending' as team_status,
              true as pending, token as invite_token
       from team_invites
       where master_user_id = $1 and accepted_at is null
       order by created_at desc`, [context.userId]);
	const clients = await sql`
      select id, name from clients where cleaner_user_id = ${context.userId} order by name
    `;
	return {
		members: [...pending.map((m) => ({
			...m,
			assigned_clients: []
		})), ...members.map((m) => {
			const { assigned_json: _ignored, ...rest } = m;
			return {
				...rest,
				assigned_clients: parseClientRefs(m.assigned_json)
			};
		})],
		clients,
		teamMessagingEnabled: actor.profile.team_messaging_enabled
	};
});
var listAssignableStaff_createServerFn_handler = createServerRpc({
	id: "20cb9200317ac161a7c445bb0578980ac0259ac0fde9a2f3647ac8ebef0f010b",
	name: "listAssignableStaff",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => listAssignableStaff.__executeServer(opts));
var listAssignableStaff = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listAssignableStaff_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	if ((await getActor(sql, context.userId)).kind !== "cleaner") return [];
	return sql`
      select user_id, full_name from profiles
      where master_user_id = ${context.userId}
        and coalesce(team_status, 'active') = 'active'
      order by full_name
    `;
});
var createTeamInvite_createServerFn_handler = createServerRpc({
	id: "78dbb185bc52a8a04d63c452731c6d0a1486ab66648ac2d6e3afc9234a5756a5",
	name: "createTeamInvite",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => createTeamInvite.__executeServer(opts));
var createTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const name = input.name.trim();
	if (!name) throw new Error("Name is required.");
	return {
		name,
		phone: input.phone?.trim() || null,
		email: input.email?.trim() || null,
		canMessage: input.canMessage !== false
	};
}).handler(createTeamInvite_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const token = nid("tinv").replace(/-/g, "").slice(0, 22);
	await sql`
      insert into team_invites (id, token, master_user_id, name, phone, email, can_message)
      values (${nid("tinv")}, ${token}, ${context.userId}, ${data.name}, ${data.phone}, ${data.email}, ${data.canMessage})
    `;
	return {
		token,
		path: `/team-invite/${token}`,
		name: data.name,
		email: data.email
	};
});
var getTeamInvitePublic_createServerFn_handler = createServerRpc({
	id: "a4ac1f54a72e97185c4b500f68491d19e268ab6a5f76cf6a5fa09e5a29b9b0a7",
	name: "getTeamInvitePublic",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => getTeamInvitePublic.__executeServer(opts));
var getTeamInvitePublic = createServerFn({ method: "GET" }).validator((token) => token).handler(getTeamInvitePublic_createServerFn_handler, async ({ data: token }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const invite = (await sql.query(`select i.token, i.name, i.email, i.accepted_at::text as accepted_at,
              p.business_name, p.full_name as cleaner_name
       from team_invites i
       join profiles p on p.user_id = i.master_user_id
       where i.token = $1 limit 1`, [token]))[0];
	if (!invite) throw new Error("This team invite is invalid.");
	return invite;
});
var acceptTeamInvite_createServerFn_handler = createServerRpc({
	id: "439d10020b556785713a03b95295287d839175f23c409c50fcae37f7c65461e6",
	name: "acceptTeamInvite",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => acceptTeamInvite.__executeServer(opts));
var acceptTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((token) => token).handler(acceptTeamInvite_createServerFn_handler, async ({ context, data: token }) => {
	const sql = await getSql();
	const invite = (await sql`
      select master_user_id, name, email, phone, can_message, accepted_at::text as accepted_at
      from team_invites where token = ${token} limit 1
    `)[0];
	if (!invite) throw new Error("This invite is invalid.");
	if (invite.accepted_at) throw new Error("This invite was already used.");
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") throw new Error("You're signed in as an owner. Sign out to join as a team cleaner.");
	if (actor.kind === "client" || actor.kind === "client_unlinked") throw new Error("This login is a client portal. Sign out to join as a team cleaner.");
	const u = (await sql`
      select name, email from "user" where id = ${context.userId} limit 1
    `)[0];
	await sql`
      insert into profiles (
        user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
        can_message, team_status
      ) values (
        ${context.userId}, ${"cleaner"}, ${u?.name || invite.name}, ${invite.phone},
        ${u?.email || invite.email}, ${"team"}, ${invite.master_user_id},
        ${invite.can_message}, ${"active"}
      )
      on conflict (user_id) do update set
        cleaner_kind = 'team',
        master_user_id = ${invite.master_user_id},
        can_message = ${invite.can_message},
        team_status = 'active',
        role = 'cleaner'
    `;
	await sql`update team_invites set accepted_at = now() where token = ${token}`;
	return { ok: true };
});
var updateTeamMember_createServerFn_handler = createServerRpc({
	id: "2188f7aa9bc71672720e1e3b50778ff7efe85f0f80584e75b778b3f32af30cd9",
	name: "updateTeamMember",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => updateTeamMember.__executeServer(opts));
var updateTeamMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(updateTeamMember_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	if (!(await sql.query(`select ${PROFILE_COLUMNS} from profiles where user_id = $1 and master_user_id = $2 limit 1`, [data.userId, context.userId]))[0]) throw new Error("Team cleaner not found.");
	if (data.fullName != null) {
		const name = data.fullName.trim();
		if (!name) throw new Error("Name is required.");
		await sql`update profiles set full_name = ${name} where user_id = ${data.userId}`;
		await sql`update "user" set name = ${name} where id = ${data.userId}`;
	}
	if (data.phone !== void 0) await sql`update profiles set phone = ${data.phone.trim() || null} where user_id = ${data.userId}`;
	if (data.email !== void 0) await sql`update profiles set email = ${data.email.trim() || null} where user_id = ${data.userId}`;
	if (data.canMessage != null) await sql`update profiles set can_message = ${data.canMessage} where user_id = ${data.userId}`;
	if (data.status) await sql`update profiles set team_status = ${data.status} where user_id = ${data.userId}`;
	if (data.assignedClientIds) {
		const owned = await sql`
        select id from clients where cleaner_user_id = ${context.userId}
      `;
		const allowed = new Set(owned.map((c) => c.id));
		const next = new Set(data.assignedClientIds.filter((id) => allowed.has(id)));
		const current = await sql`
        select ca.client_id from client_assignees ca
        join clients c on c.id = ca.client_id
        where ca.user_id = ${data.userId} and c.cleaner_user_id = ${context.userId}
      `;
		const currentSet = new Set(current.map((c) => c.client_id));
		for (const id of next) if (!currentSet.has(id)) await addMemberToClient(sql, id, data.userId);
		for (const id of currentSet) if (!next.has(id)) await removeMemberFromClient(sql, id, data.userId);
	}
	return { ok: true };
});
var resendTeamInvite_createServerFn_handler = createServerRpc({
	id: "37a3f7652d465240b0f05612cc4bdbdc90836632a10142d9a441bc5ec2e9bce3",
	name: "resendTeamInvite",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => resendTeamInvite.__executeServer(opts));
var resendTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(resendTeamInvite_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	if (data.inviteToken) {
		const rows = await sql`
        select token, name, email from team_invites
        where token = ${data.inviteToken} and master_user_id = ${context.userId} and accepted_at is null
        limit 1
      `;
		if (!rows[0]) throw new Error("Invite not found.");
		return {
			token: rows[0].token,
			path: `/team-invite/${rows[0].token}`,
			name: rows[0].name,
			email: rows[0].email
		};
	}
	if (!data.userId) throw new Error("Choose a team cleaner.");
	const member = await sql`
      select full_name, email, phone, can_message from profiles
      where user_id = ${data.userId} and master_user_id = ${context.userId} limit 1
    `;
	if (!member[0]) throw new Error("Team cleaner not found.");
	const token = nid("tinv").replace(/-/g, "").slice(0, 22);
	await sql`
      insert into team_invites (id, token, master_user_id, name, phone, email, can_message)
      values (${nid("tinv")}, ${token}, ${context.userId}, ${member[0].full_name}, ${member[0].phone}, ${member[0].email}, ${member[0].can_message})
    `;
	return {
		token,
		path: `/team-invite/${token}`,
		name: member[0].full_name,
		email: member[0].email
	};
});
var deleteTeamMember_createServerFn_handler = createServerRpc({
	id: "f97ced425749bf09d9e806164edaafdc110325bb152cc56e1a4a5671871ae04a",
	name: "deleteTeamMember",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => deleteTeamMember.__executeServer(opts));
var deleteTeamMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(deleteTeamMember_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	if (data.pending) {
		const invite = await sql`
        select name from team_invites where id = ${data.userId} and master_user_id = ${context.userId} limit 1
      `;
		if (!invite[0]) {
			const byToken = await sql`
          select name from team_invites where token = ${data.userId} and master_user_id = ${context.userId} limit 1
        `;
			if (!byToken[0]) throw new Error("Invite not found.");
			await sql`delete from team_invites where token = ${data.userId} and master_user_id = ${context.userId}`;
			return {
				ok: true,
				name: byToken[0].name
			};
		}
		await sql`delete from team_invites where id = ${data.userId} and master_user_id = ${context.userId}`;
		return {
			ok: true,
			name: invite[0].name
		};
	}
	const member = await sql`
      select full_name from profiles where user_id = ${data.userId} and master_user_id = ${context.userId} limit 1
    `;
	if (!member[0]) throw new Error("Team cleaner not found.");
	await sql`delete from job_assignees where user_id = ${data.userId}`;
	await sql`delete from client_assignees where user_id = ${data.userId}`;
	await sql`update jobs set assigned_to_user_id = null where assigned_to_user_id = ${data.userId}`;
	await sql`delete from notifications where user_id = ${data.userId}`;
	await sql`delete from profiles where user_id = ${data.userId} and master_user_id = ${context.userId}`;
	return {
		ok: true,
		name: member[0].full_name
	};
});
var setTeamMessaging_createServerFn_handler = createServerRpc({
	id: "e1b8422f83c82a8f8f0fa3114a7a3aec4a3f9d8363b8e5eff90949347d2bf5ca",
	name: "setTeamMessaging",
	filename: "src/lib/sweepbook/team.ts"
}, (opts) => setTeamMessaging.__executeServer(opts));
var setTeamMessaging = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((enabled) => enabled).handler(setTeamMessaging_createServerFn_handler, async ({ context, data: enabled }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	await sql`update profiles set team_messaging_enabled = ${enabled} where user_id = ${context.userId}`;
	return { ok: true };
});
//#endregion
export { acceptTeamInvite_createServerFn_handler, createTeamInvite_createServerFn_handler, deleteTeamMember_createServerFn_handler, getTeamInvitePublic_createServerFn_handler, listAssignableStaff_createServerFn_handler, listTeam_createServerFn_handler, resendTeamInvite_createServerFn_handler, setTeamMessaging_createServerFn_handler, updateTeamMember_createServerFn_handler };
