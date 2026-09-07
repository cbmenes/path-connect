import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { PROFILE_COLUMNS, assertCleaner, getActor } from "./access";
import { addMemberToClient, removeMemberFromClient } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import { parsePayType, type PayType } from "./team-pay";
import type { Profile, TeamMember, TeamStatus } from "./types";

function parseClientRefs(raw: unknown): { id: string; name: string }[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is { id: string; name: string } => Boolean(x) && typeof x === "object" && "id" in x && "name" in x);
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const members = await sql.query<TeamMember & { assigned_json?: unknown }>(
      `select user_id, full_name, phone, email, can_message, coalesce(team_status, 'active') as team_status,
              false as pending,
              coalesce(pay_type, 'none') as pay_type,
              coalesce(pay_amount, 0)::int as pay_amount,
              pay_note,
              (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::json)
                 from client_assignees ca join clients c on c.id = ca.client_id
                 where ca.user_id = profiles.user_id) as assigned_json
       from profiles
       where master_user_id = $1 and role = 'cleaner'
       order by full_name`,
      [context.userId],
    );
    const pending = await sql.query<TeamMember>(
      `select id as user_id, name as full_name, phone, email, can_message, 'pending' as team_status,
              true as pending, token as invite_token,
              (invited_at is not null) as invite_sent
       from team_invites
       where master_user_id = $1 and accepted_at is null
       order by created_at desc`,
      [context.userId],
    );
    const clients = await sql<{ id: string; name: string }>`
      select id, name from clients where cleaner_user_id = ${context.userId} order by name
    `;
    return {
      members: [
        ...pending.map((m) => {
          const sent = m.invite_sent as unknown;
          return {
            ...m,
            invite_sent: sent === true || sent === "t" || sent === "true",
            assigned_clients: [] as { id: string; name: string }[],
          };
        }),
        ...members.map((m) => {
          const { assigned_json: _ignored, ...rest } = m;
          return {
            ...rest,
            pay_type: parsePayType(rest.pay_type),
            pay_amount: Number(rest.pay_amount || 0),
            assigned_clients: parseClientRefs(m.assigned_json),
          };
        }),
      ],
      clients,
      teamMessagingEnabled: actor.profile.team_messaging_enabled,
    };
  });

export const listAssignableStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind !== "cleaner") return [] as { user_id: string; full_name: string }[];
    return sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles
      where master_user_id = ${context.userId}
        and coalesce(team_status, 'active') = 'active'
      order by full_name
    `;
  });

async function upsertSavedInvite(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  data: { name: string; phone: string | null; email: string | null; canMessage: boolean },
) {
  if (data.email) {
    const existing = await sql<{ id: string; token: string; invited_at: string | null }>`
      select id, token, invited_at::text as invited_at from team_invites
      where master_user_id = ${ownerId} and accepted_at is null
        and lower(email) = ${data.email.toLowerCase()}
      limit 1
    `;
    if (existing[0]) {
      await sql`
        update team_invites
        set name = ${data.name}, phone = ${data.phone}, can_message = ${data.canMessage}
        where id = ${existing[0].id}
      `;
      return { id: existing[0].id, token: existing[0].token, alreadyInvited: Boolean(existing[0].invited_at) };
    }
  }
  const token = nid("tinv").replace(/-/g, "").slice(0, 22);
  const id = nid("tinv");
  await sql`
    insert into team_invites (id, token, master_user_id, name, phone, email, can_message)
    values (${id}, ${token}, ${ownerId}, ${data.name}, ${data.phone}, ${data.email}, ${data.canMessage})
  `;
  return { id, token, alreadyInvited: false };
}

function teamFormInput(input: { name: string; phone?: string; email?: string; canMessage?: boolean }) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  return {
    name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    canMessage: input.canMessage !== false,
  };
}

export const saveTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(teamFormInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const saved = await upsertSavedInvite(sql, context.userId, data);
    return {
      token: saved.token,
      path: `/team-invite/${saved.token}`,
      name: data.name,
      email: data.email,
      inviteSent: saved.alreadyInvited,
    };
  });

export const createTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(teamFormInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const saved = await upsertSavedInvite(sql, context.userId, data);
    await sql`update team_invites set invited_at = now() where token = ${saved.token}`;
    return { token: saved.token, path: `/team-invite/${saved.token}`, name: data.name, email: data.email };
  });

export const getTeamInvitePublic = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const rows = await sql.query<{
      token: string;
      name: string;
      email: string | null;
      business_name: string | null;
      cleaner_name: string;
      accepted_at: string | null;
    }>(
      `select i.token, i.name, i.email, i.accepted_at::text as accepted_at,
              p.business_name, p.full_name as cleaner_name
       from team_invites i
       join profiles p on p.user_id = i.master_user_id
       where i.token = $1 limit 1`,
      [token],
    );
    const invite = rows[0];
    if (!invite) throw new Error("This team invite is invalid.");
    return invite;
  });

export const acceptTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((token: string) => token)
  .handler(async ({ context, data: token }) => {
    const sql = await getSql();
    const rows = await sql<{
      master_user_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      can_message: boolean;
      accepted_at: string | null;
    }>`
      select master_user_id, name, email, phone, can_message, accepted_at::text as accepted_at
      from team_invites where token = ${token} limit 1
    `;
    const invite = rows[0];
    if (!invite) throw new Error("This invite is invalid.");
    if (invite.accepted_at) throw new Error("This invite was already used.");
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      throw new Error("You're signed in as an owner. Sign out to join as a team cleaner.");
    }
    if (actor.kind === "client" || actor.kind === "client_unlinked") {
      throw new Error("This login is a client portal. Sign out to join as a team cleaner.");
    }
    const users = await sql<{ name: string; email: string }>`
      select name, email from "user" where id = ${context.userId} limit 1
    `;
    const u = users[0];
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

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    userId: string;
    fullName?: string;
    phone?: string;
    email?: string;
    canMessage?: boolean;
    status?: TeamStatus;
    assignedClientIds?: string[];
    payType?: PayType;
    payAmount?: number;
    payNote?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const members = await sql.query<Profile>(
      `select ${PROFILE_COLUMNS} from profiles where user_id = $1 and master_user_id = $2 limit 1`,
      [data.userId, context.userId],
    );
    if (!members[0]) throw new Error("Team cleaner not found.");
    if (data.fullName != null) {
      const name = data.fullName.trim();
      if (!name) throw new Error("Name is required.");
      await sql`update profiles set full_name = ${name} where user_id = ${data.userId}`;
      await sql`update "user" set name = ${name} where id = ${data.userId}`;
    }
    if (data.phone !== undefined) {
      await sql`update profiles set phone = ${data.phone.trim() || null} where user_id = ${data.userId}`;
    }
    if (data.email !== undefined) {
      const email = data.email.trim() || null;
      await sql`update profiles set email = ${email} where user_id = ${data.userId}`;
    }
    if (data.canMessage != null) {
      await sql`update profiles set can_message = ${data.canMessage} where user_id = ${data.userId}`;
    }
    if (data.status) {
      await sql`update profiles set team_status = ${data.status} where user_id = ${data.userId}`;
    }
    if (data.payType !== undefined) {
      const payType = parsePayType(data.payType);
      let payAmount = Math.max(0, Math.round(Number(data.payAmount || 0)));
      if (payType === "none") payAmount = 0;
      if (payType === "percent") payAmount = Math.min(100, payAmount);
      const payNote = data.payNote?.trim() || null;
      await sql`
        update profiles
        set pay_type = ${payType}, pay_amount = ${payAmount}, pay_note = ${payNote}
        where user_id = ${data.userId} and master_user_id = ${context.userId}
      `;
    }
    if (data.assignedClientIds) {
      const owned = await sql<{ id: string }>`
        select id from clients where cleaner_user_id = ${context.userId}
      `;
      const allowed = new Set(owned.map((c) => c.id));
      const next = new Set(data.assignedClientIds.filter((id) => allowed.has(id)));
      const current = await sql<{ client_id: string }>`
        select ca.client_id from client_assignees ca
        join clients c on c.id = ca.client_id
        where ca.user_id = ${data.userId} and c.cleaner_user_id = ${context.userId}
      `;
      const currentSet = new Set(current.map((c) => c.client_id));
      for (const id of next) {
        if (!currentSet.has(id)) await addMemberToClient(sql, id, data.userId);
      }
      for (const id of currentSet) {
        if (!next.has(id)) await removeMemberFromClient(sql, id, data.userId);
      }
    }
    return { ok: true };
  });

export const resendTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string; inviteToken?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    if (data.inviteToken) {
      const rows = await sql<{ token: string; name: string; email: string | null }>`
        select token, name, email from team_invites
        where token = ${data.inviteToken} and master_user_id = ${context.userId} and accepted_at is null
        limit 1
      `;
      if (!rows[0]) throw new Error("Invite not found.");
      await sql`update team_invites set invited_at = now() where token = ${rows[0].token}`;
      return { token: rows[0].token, path: `/team-invite/${rows[0].token}`, name: rows[0].name, email: rows[0].email };
    }
    if (!data.userId) throw new Error("Choose a team cleaner.");
    const member = await sql<{ full_name: string; email: string | null; phone: string | null; can_message: boolean }>`
      select full_name, email, phone, can_message from profiles
      where user_id = ${data.userId} and master_user_id = ${context.userId} limit 1
    `;
    if (!member[0]) throw new Error("Team cleaner not found.");
    const token = nid("tinv").replace(/-/g, "").slice(0, 22);
    await sql`
      insert into team_invites (id, token, master_user_id, name, phone, email, can_message, invited_at)
      values (${nid("tinv")}, ${token}, ${context.userId}, ${member[0].full_name}, ${member[0].phone}, ${member[0].email}, ${member[0].can_message}, now())
    `;
    return { token, path: `/team-invite/${token}`, name: member[0].full_name, email: member[0].email };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; pending?: boolean }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    if (data.pending) {
      const invite = await sql<{ name: string }>`
        select name from team_invites where id = ${data.userId} and master_user_id = ${context.userId} limit 1
      `;
      if (!invite[0]) {
        const byToken = await sql<{ name: string }>`
          select name from team_invites where token = ${data.userId} and master_user_id = ${context.userId} limit 1
        `;
        if (!byToken[0]) throw new Error("Invite not found.");
        await sql`delete from team_invites where token = ${data.userId} and master_user_id = ${context.userId}`;
        return { ok: true, name: byToken[0].name };
      }
      await sql`delete from team_invites where id = ${data.userId} and master_user_id = ${context.userId}`;
      return { ok: true, name: invite[0].name };
    }
    const member = await sql<{ full_name: string }>`
      select full_name from profiles where user_id = ${data.userId} and master_user_id = ${context.userId} limit 1
    `;
    if (!member[0]) throw new Error("Team cleaner not found.");
    await sql`delete from job_assignees where user_id = ${data.userId}`;
    await sql`delete from client_assignees where user_id = ${data.userId}`;
    await sql`update jobs set assigned_to_user_id = null where assigned_to_user_id = ${data.userId}`;
    await sql`delete from notifications where user_id = ${data.userId}`;
    await sql`delete from profiles where user_id = ${data.userId} and master_user_id = ${context.userId}`;
    return { ok: true, name: member[0].full_name };
  });

export const setTeamMessaging = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((enabled: boolean) => enabled)
  .handler(async ({ context, data: enabled }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    await sql`update profiles set team_messaging_enabled = ${enabled} where user_id = ${context.userId}`;
    return { ok: true };
  });
