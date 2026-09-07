import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { PROFILE_COLUMNS, assertCleaner, assertOffice, getActor, masterUserId } from "./access";
import { addMemberToClient, removeMemberFromClient } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import { parsePayType, type PayType } from "./team-pay";
import type { OfficeRole, Profile, TeamMember, TeamStatus } from "./types";

function asBool(v: unknown, fallback = false) {
  if (v === true || v === "t" || v === "true") return true;
  if (v === false || v === "f" || v === "false") return false;
  return fallback;
}

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

function parseOfficeRole(raw: unknown): OfficeRole {
  return raw === "admin" ? "admin" : "team";
}

function mapMember(
  m: TeamMember & { assigned_json?: unknown },
  includePay: boolean,
): TeamMember {
  const { assigned_json: _ignored, ...rest } = m;
  const officeRole = parseOfficeRole(rest.office_role);
  return {
    ...rest,
    office_role: officeRole,
    can_charge: asBool(rest.can_charge, false),
    can_message: asBool(rest.can_message, true),
    invite_sent: asBool(rest.invite_sent, false),
    pay_type: includePay && officeRole === "team" ? parsePayType(rest.pay_type) : undefined,
    pay_amount: includePay && officeRole === "team" ? Number(rest.pay_amount || 0) : undefined,
    pay_note: includePay && officeRole === "team" ? rest.pay_note ?? null : undefined,
    assigned_clients: parseClientRefs(m.assigned_json),
  };
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const includePay = actor.kind === "cleaner";
    const members = await sql.query<TeamMember & { assigned_json?: unknown }>(
      `select user_id, full_name, phone, email, can_message, coalesce(team_status, 'active') as team_status,
              false as pending,
              coalesce(cleaner_kind, 'team') as office_role,
              coalesce(can_charge, false) as can_charge,
              coalesce(pay_type, 'none') as pay_type,
              coalesce(pay_amount, 0)::int as pay_amount,
              pay_note,
              (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::json)
                 from client_assignees ca join clients c on c.id = ca.client_id
                 where ca.user_id = profiles.user_id) as assigned_json
       from profiles
       where master_user_id = $1 and role = 'cleaner'
         and coalesce(cleaner_kind, 'team') in ('team', 'admin')
       order by full_name`,
      [ownerId],
    );
    const pending = await sql.query<TeamMember>(
      `select id as user_id, name as full_name, phone, email, can_message, 'pending' as team_status,
              true as pending, token as invite_token,
              (invited_at is not null) as invite_sent,
              coalesce(invite_kind, 'team') as office_role,
              coalesce(can_charge, false) as can_charge
       from team_invites
       where master_user_id = $1 and accepted_at is null
       order by created_at desc`,
      [ownerId],
    );
    const clients = await sql<{ id: string; name: string }>`
      select id, name from clients where cleaner_user_id = ${ownerId} order by name
    `;
    const all = [
      ...pending.map((m) =>
        mapMember(
          { ...m, assigned_json: [] },
          includePay,
        ),
      ),
      ...members.map((m) => mapMember(m, includePay)),
    ];
    const teamMembers = all.filter((m) => m.office_role !== "admin");
    const admins = actor.kind === "cleaner" ? all.filter((m) => m.office_role === "admin") : [];
    return {
      members: teamMembers,
      admins,
      clients,
      teamMessagingEnabled: actor.kind === "cleaner"
        ? actor.profile.team_messaging_enabled
        : asBool(
            (
              await sql<{ team_messaging_enabled: boolean }>`
                select team_messaging_enabled from profiles where user_id = ${ownerId} limit 1
              `
            )[0]?.team_messaging_enabled,
            true,
          ),
      canManageAdmins: actor.kind === "cleaner",
      canEditPay: includePay,
      canToggleAccountMessaging: actor.kind === "cleaner",
    };
  });

export const listAssignableStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (!actor || (actor.kind !== "cleaner" && actor.kind !== "admin")) {
      return [] as { user_id: string; full_name: string }[];
    }
    const ownerId = masterUserId(actor);
    return sql<{ user_id: string; full_name: string }>`
      select user_id, full_name from profiles
      where master_user_id = ${ownerId}
        and coalesce(team_status, 'active') = 'active'
        and coalesce(cleaner_kind, 'team') = 'team'
      order by full_name
    `;
  });

async function upsertSavedInvite(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  data: {
    name: string;
    phone: string | null;
    email: string | null;
    canMessage: boolean;
    inviteKind: OfficeRole;
    canCharge: boolean;
  },
) {
  if (data.email) {
    const existing = await sql<{ id: string; token: string; invited_at: string | null }>`
      select id, token, invited_at::text as invited_at from team_invites
      where master_user_id = ${ownerId} and accepted_at is null
        and lower(email) = ${data.email.toLowerCase()}
        and coalesce(invite_kind, 'team') = ${data.inviteKind}
      limit 1
    `;
    if (existing[0]) {
      await sql`
        update team_invites
        set name = ${data.name}, phone = ${data.phone}, can_message = ${data.canMessage},
            invite_kind = ${data.inviteKind}, can_charge = ${data.canCharge}
        where id = ${existing[0].id}
      `;
      return { id: existing[0].id, token: existing[0].token, alreadyInvited: Boolean(existing[0].invited_at) };
    }
  }
  const token = nid("tinv").replace(/-/g, "").slice(0, 22);
  const id = nid("tinv");
  await sql`
    insert into team_invites (id, token, master_user_id, name, phone, email, can_message, invite_kind, can_charge)
    values (${id}, ${token}, ${ownerId}, ${data.name}, ${data.phone}, ${data.email}, ${data.canMessage}, ${data.inviteKind}, ${data.canCharge})
  `;
  return { id, token, alreadyInvited: false };
}

function teamFormInput(input: {
  name: string;
  phone?: string;
  email?: string;
  canMessage?: boolean;
  inviteKind?: OfficeRole;
  canCharge?: boolean;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const inviteKind: OfficeRole = input.inviteKind === "admin" ? "admin" : "team";
  return {
    name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    canMessage: inviteKind === "admin" ? true : input.canMessage !== false,
    inviteKind,
    canCharge: inviteKind === "admin" ? Boolean(input.canCharge) : false,
  };
}

export const saveTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(teamFormInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    if (data.inviteKind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Only the account owner can add an admin.");
    }
    const saved = await upsertSavedInvite(sql, masterUserId(actor), data);
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
    assertOffice(actor);
    if (data.inviteKind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Only the account owner can invite an admin.");
    }
    const saved = await upsertSavedInvite(sql, masterUserId(actor), data);
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
      invite_kind: string;
    }>(
      `select i.token, i.name, i.email, i.accepted_at::text as accepted_at,
              coalesce(i.invite_kind, 'team') as invite_kind,
              p.business_name, p.full_name as cleaner_name
       from team_invites i
       join profiles p on p.user_id = i.master_user_id
       where i.token = $1 limit 1`,
      [token],
    );
    const invite = rows[0];
    if (!invite) throw new Error("This team invite is invalid.");
    return { ...invite, invite_kind: parseOfficeRole(invite.invite_kind) };
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
      invite_kind: string;
      can_charge: boolean;
    }>`
      select master_user_id, name, email, phone, can_message, accepted_at::text as accepted_at,
             coalesce(invite_kind, 'team') as invite_kind, coalesce(can_charge, false) as can_charge
      from team_invites where token = ${token} limit 1
    `;
    const invite = rows[0];
    if (!invite) throw new Error("This invite is invalid.");
    if (invite.accepted_at) throw new Error("This invite was already used.");
    if (invite.master_user_id === context.userId) {
      throw new Error("The account owner cannot accept this invite.");
    }
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      throw new Error("You're signed in as an owner. Sign out to join as office or team staff.");
    }
    if (actor.kind === "admin") {
      throw new Error("You're already signed in as office staff. Sign out to accept a different invite.");
    }
    if (actor.kind === "client" || actor.kind === "client_unlinked") {
      throw new Error("This login is a client portal. Sign out to join the office or team.");
    }
    const users = await sql<{ name: string; email: string }>`
      select name, email from "user" where id = ${context.userId} limit 1
    `;
    const u = users[0];
    const kind = parseOfficeRole(invite.invite_kind);
    const canCharge = kind === "admin" ? asBool(invite.can_charge, false) : false;
    await sql`
      insert into profiles (
        user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
        can_message, team_status, can_charge
      ) values (
        ${context.userId}, ${"cleaner"}, ${u?.name || invite.name}, ${invite.phone},
        ${u?.email || invite.email}, ${kind}, ${invite.master_user_id},
        ${invite.can_message}, ${"active"}, ${canCharge}
      )
      on conflict (user_id) do update set
        cleaner_kind = ${kind},
        master_user_id = ${invite.master_user_id},
        can_message = ${invite.can_message},
        team_status = 'active',
        role = 'cleaner',
        can_charge = ${canCharge}
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
    canCharge?: boolean;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    if (data.userId === ownerId) {
      throw new Error("The account owner cannot be changed from Team.");
    }
    const members = await sql.query<Profile>(
      `select ${PROFILE_COLUMNS} from profiles where user_id = $1 and master_user_id = $2 limit 1`,
      [data.userId, ownerId],
    );
    const member = members[0];
    if (!member) throw new Error("Person not found.");
    if (member.cleaner_kind === "master") {
      throw new Error("The account owner cannot be changed from Team.");
    }
    if (actor.kind === "admin" && member.cleaner_kind === "admin") {
      throw new Error("Admins cannot edit other office admins.");
    }
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
    if (data.canMessage != null && member.cleaner_kind !== "admin") {
      await sql`update profiles set can_message = ${data.canMessage} where user_id = ${data.userId}`;
    }
    if (data.status) {
      await sql`update profiles set team_status = ${data.status} where user_id = ${data.userId}`;
    }
    if (data.canCharge != null) {
      if (actor.kind !== "cleaner") throw new Error("Only the account owner can change charge permission.");
      if (member.cleaner_kind !== "admin") throw new Error("Charge permission is for admins.");
      await sql`update profiles set can_charge = ${data.canCharge} where user_id = ${data.userId}`;
    }
    if (data.payType !== undefined) {
      if (actor.kind !== "cleaner") throw new Error("Only the account owner can edit pay rates.");
      if (member.cleaner_kind === "admin") throw new Error("Admins do not have a team pay rate.");
      const payType = parsePayType(data.payType);
      let payAmount = Math.max(0, Math.round(Number(data.payAmount || 0)));
      if (payType === "none") payAmount = 0;
      if (payType === "percent") payAmount = Math.min(100, payAmount);
      const payNote = data.payNote?.trim() || null;
      await sql`
        update profiles
        set pay_type = ${payType}, pay_amount = ${payAmount}, pay_note = ${payNote}
        where user_id = ${data.userId} and master_user_id = ${ownerId}
      `;
    }
    if (data.assignedClientIds && member.cleaner_kind !== "admin") {
      const owned = await sql<{ id: string }>`
        select id from clients where cleaner_user_id = ${ownerId}
      `;
      const allowed = new Set(owned.map((c) => c.id));
      const next = new Set(data.assignedClientIds.filter((id) => allowed.has(id)));
      const current = await sql<{ client_id: string }>`
        select ca.client_id from client_assignees ca
        join clients c on c.id = ca.client_id
        where ca.user_id = ${data.userId} and c.cleaner_user_id = ${ownerId}
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
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    if (data.inviteToken) {
      const rows = await sql<{ token: string; name: string; email: string | null; invite_kind: string }>`
        select token, name, email, coalesce(invite_kind, 'team') as invite_kind from team_invites
        where token = ${data.inviteToken} and master_user_id = ${ownerId} and accepted_at is null
        limit 1
      `;
      if (!rows[0]) throw new Error("Invite not found.");
      if (rows[0].invite_kind === "admin" && actor.kind !== "cleaner") {
        throw new Error("Only the account owner can resend an admin invite.");
      }
      await sql`update team_invites set invited_at = now() where token = ${rows[0].token}`;
      return { token: rows[0].token, path: `/team-invite/${rows[0].token}`, name: rows[0].name, email: rows[0].email };
    }
    if (!data.userId) throw new Error("Choose a person.");
    const member = await sql<{
      full_name: string;
      email: string | null;
      phone: string | null;
      can_message: boolean;
      cleaner_kind: string | null;
      can_charge: boolean;
    }>`
      select full_name, email, phone, can_message, cleaner_kind, coalesce(can_charge, false) as can_charge
      from profiles
      where user_id = ${data.userId} and master_user_id = ${ownerId} limit 1
    `;
    if (!member[0]) throw new Error("Person not found.");
    const kind = parseOfficeRole(member[0].cleaner_kind);
    if (kind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Only the account owner can invite an admin.");
    }
    const token = nid("tinv").replace(/-/g, "").slice(0, 22);
    await sql`
      insert into team_invites (id, token, master_user_id, name, phone, email, can_message, invited_at, invite_kind, can_charge)
      values (${nid("tinv")}, ${token}, ${ownerId}, ${member[0].full_name}, ${member[0].phone}, ${member[0].email}, ${member[0].can_message}, now(), ${kind}, ${asBool(member[0].can_charge, false)})
    `;
    return { token, path: `/team-invite/${token}`, name: member[0].full_name, email: member[0].email };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; pending?: boolean }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    if (data.userId === ownerId) {
      throw new Error("The account owner cannot be removed.");
    }
    if (data.pending) {
      const invite = await sql<{ name: string; invite_kind: string }>`
        select name, coalesce(invite_kind, 'team') as invite_kind
        from team_invites where id = ${data.userId} and master_user_id = ${ownerId} limit 1
      `;
      if (!invite[0]) {
        const byToken = await sql<{ name: string; invite_kind: string }>`
          select name, coalesce(invite_kind, 'team') as invite_kind
          from team_invites where token = ${data.userId} and master_user_id = ${ownerId} limit 1
        `;
        if (!byToken[0]) throw new Error("Invite not found.");
        if (byToken[0].invite_kind === "admin" && actor.kind !== "cleaner") {
          throw new Error("Admins cannot remove an admin invite.");
        }
        await sql`delete from team_invites where token = ${data.userId} and master_user_id = ${ownerId}`;
        return { ok: true, name: byToken[0].name };
      }
      if (invite[0].invite_kind === "admin" && actor.kind !== "cleaner") {
        throw new Error("Admins cannot remove an admin invite.");
      }
      await sql`delete from team_invites where id = ${data.userId} and master_user_id = ${ownerId}`;
      return { ok: true, name: invite[0].name };
    }
    const member = await sql<{ full_name: string; cleaner_kind: string | null }>`
      select full_name, cleaner_kind from profiles
      where user_id = ${data.userId} and master_user_id = ${ownerId} limit 1
    `;
    if (!member[0]) throw new Error("Person not found.");
    if (member[0].cleaner_kind === "master") {
      throw new Error("The account owner cannot be removed.");
    }
    if (member[0].cleaner_kind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Admins cannot remove the account owner or other admins.");
    }
    await sql`delete from job_assignees where user_id = ${data.userId}`;
    await sql`delete from client_assignees where user_id = ${data.userId}`;
    await sql`update jobs set assigned_to_user_id = null where assigned_to_user_id = ${data.userId}`;
    await sql`delete from notifications where user_id = ${data.userId}`;
    await sql`delete from profiles where user_id = ${data.userId} and master_user_id = ${ownerId}`;
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
