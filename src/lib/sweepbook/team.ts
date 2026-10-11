import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { PROFILE_COLUMNS, assertOffice, assertActivePlan, getActor, masterUserId, subscriptionInactive } from "./access";
import { enableTeamAccount, setTeamAccountToggle, setTeamPersonToggle } from "./team-toggles";
import { addMemberToClient, removeMemberFromClient, replaceClientAssignmentsForInvite } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { namesFrom, storePhone } from "./people";
import { nid } from "./time";
import { parsePayType, teamPayAllowed, type PayType } from "./team-pay";
import { isDemoAccountEmail, type OfficeRole, type Profile, type TeamMember, type TeamStatus } from "./types";
import { normalizePersonDetails, parseAvailabilityJson, type PersonDetailsInput } from "./availability";

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

async function syncExtraAdminSeats(ownerId: string) {
  const { syncOwnerExtraAdmins } = await import("./stripe.server");
  await syncOwnerExtraAdmins(ownerId);
}

async function assertAdminSeatOpen(sql: Awaited<ReturnType<typeof getSql>>, masterId: string) {
  const rows = await sql<{
    plan_status: string | null;
    email: string | null;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null;
  }>`
    select p.plan_status, u.email, coalesce(p.cancel_at_period_end, false) as cancel_at_period_end,
           p.current_period_end::text as current_period_end
    from profiles p
    join "user" u on u.id = p.user_id
    where p.user_id = ${masterId}
    limit 1
  `;
  if (isDemoAccountEmail(rows[0]?.email)) return;
  if (
    subscriptionInactive({
      status: rows[0]?.plan_status || "trial",
      cancelAtPeriodEnd: rows[0]?.cancel_at_period_end,
      periodEnd: rows[0]?.current_period_end,
    })
  ) {
    throw new Error("Your plan is inactive. Resume it in Settings to make changes.");
  }
}

function mapMember(
  m: TeamMember & { assigned_json?: unknown; availability_json?: unknown },
  includePay: boolean,
): TeamMember {
  const { assigned_json: _ignored, availability_json, ...rest } = m;
  const officeRole = parseOfficeRole(rest.office_role);
  return {
    ...rest,
    office_role: officeRole,
    can_charge: asBool(rest.can_charge, false),
    can_message: asBool(rest.can_message, true),
    can_see_checklists: asBool(rest.can_see_checklists, true),
    can_clock_in: asBool(rest.can_clock_in, true),
    invite_sent: asBool(rest.invite_sent, false),
    pay_type: includePay && officeRole === "team" ? parsePayType(rest.pay_type) : undefined,
    pay_amount: includePay && officeRole === "team" ? Number(rest.pay_amount || 0) : undefined,
    pay_note: includePay && officeRole === "team" ? rest.pay_note ?? null : undefined,
    assigned_clients: parseClientRefs(m.assigned_json),
    staff_notes: rest.staff_notes ?? null,
    birthday: dateOnly(rest.birthday),
    start_date: dateOnly(rest.start_date),
    availability: parseAvailabilityJson(availability_json),
  };
}

function dateOnly(raw: string | null | undefined) {
  if (!raw) return null;
  const value = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

async function savePersonDetails(
  sql: Awaited<ReturnType<typeof getSql>>,
  kind: "profile" | "invite",
  id: string,
  ownerId: string,
  details: PersonDetailsInput | undefined,
) {
  if (!details) return;
  const parsed = normalizePersonDetails(details);
  if (kind === "profile") {
    await sql`
      update profiles set
        staff_notes = ${parsed.staffNotes},
        address_line1 = ${parsed.addressLine1 || null},
        address_line2 = ${parsed.addressLine2 || null},
        city = ${parsed.city || null},
        state = ${parsed.state || null},
        zip = ${parsed.zip || null},
        emergency_name = ${parsed.emergencyName},
        emergency_phone = ${parsed.emergencyPhone},
        birthday = ${parsed.birthday},
        start_date = ${parsed.startDate},
        availability_json = ${parsed.availabilityJson}
      where user_id = ${id} and master_user_id = ${ownerId}
    `;
    return;
  }
  await sql`
    update team_invites set
      staff_notes = ${parsed.staffNotes},
      address_line1 = ${parsed.addressLine1 || null},
      address_line2 = ${parsed.addressLine2 || null},
      city = ${parsed.city || null},
      state = ${parsed.state || null},
      zip = ${parsed.zip || null},
      emergency_name = ${parsed.emergencyName},
      emergency_phone = ${parsed.emergencyPhone},
      birthday = ${parsed.birthday},
      start_date = ${parsed.startDate},
      availability_json = ${parsed.availabilityJson}
    where id = ${id} and master_user_id = ${ownerId}
  `;
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const includePay = await teamPayAllowed(sql, actor);
    const members = await sql.query<TeamMember & { assigned_json?: unknown }>(
      `select user_id, full_name, first_name, last_name, phone, email, can_message,
              coalesce(can_see_checklists, true) as can_see_checklists,
              coalesce(can_clock_in, true) as can_clock_in,
              coalesce(team_status, 'active') as team_status,
              false as pending,
              coalesce(cleaner_kind, 'team') as office_role,
              coalesce(can_charge, false) as can_charge,
              coalesce(pay_type, 'none') as pay_type,
              coalesce(pay_amount, 0)::int as pay_amount,
              pay_note,
              staff_notes,
              address_line1, address_line2, city, state, zip,
              emergency_name, emergency_phone,
              birthday::text as birthday, start_date::text as start_date,
              availability_json,
              (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::json)
                 from client_assignees ca join clients c on c.id = ca.client_id
                 where ca.user_id = profiles.user_id) as assigned_json
       from profiles
       where master_user_id = $1 and role = 'cleaner'
         and coalesce(cleaner_kind, 'team') in ('team', 'admin')
       order by full_name`,
      [ownerId],
    );
    const pending = await sql.query<TeamMember & { assigned_json?: unknown }>(
      `select id as user_id, name as full_name, phone, email, can_message,
              coalesce(can_clock_in, true) as can_clock_in,
              'pending' as team_status,
              true as pending, token as invite_token,
              (invited_at is not null) as invite_sent,
              coalesce(invite_kind, 'team') as office_role,
              coalesce(can_charge, false) as can_charge,
              coalesce(pay_type, 'none') as pay_type,
              coalesce(pay_amount, 0)::int as pay_amount,
              pay_note,
              staff_notes,
              address_line1, address_line2, city, state, zip,
              emergency_name, emergency_phone,
              birthday::text as birthday, start_date::text as start_date,
              availability_json,
              (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::json)
                 from invite_client_assignees ica
                 join clients c on c.id = ica.client_id
                 where ica.invite_id = team_invites.id) as assigned_json
       from team_invites
       where master_user_id = $1 and accepted_at is null
       order by created_at desc`,
      [ownerId],
    );
    const clients = await sql<{ id: string; name: string }>`
      select id, name from clients where cleaner_user_id = ${ownerId} order by name
    `;
    const all = [
      ...pending.map((m) => mapMember(m, includePay)),
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
      teamClockInEnabled: asBool(
        actor.kind === "cleaner"
          ? actor.profile.team_clock_in_enabled
          : (
              await sql<{ team_clock_in_enabled: boolean }>`
                select team_clock_in_enabled from profiles where user_id = ${ownerId} limit 1
              `
            )[0]?.team_clock_in_enabled,
        true,
      ),
      canManageAdmins: actor.kind === "cleaner",
      canEditPay: includePay,
      teamPayEnabled: includePay,
      canToggleAccountMessaging: true,
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
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  email?: string;
  canMessage?: boolean;
  inviteKind?: OfficeRole;
  canCharge?: boolean;
}) {
  const names = namesFrom(input.firstName, input.lastName, input.name);
  if (!names.first_name || !names.last_name) throw new Error("First and last name are required.");
  const inviteKind: OfficeRole = input.inviteKind === "admin" ? "admin" : "team";
  return {
    name: names.name,
    firstName: names.first_name,
    lastName: names.last_name,
    phone: storePhone(input.phone),
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
    await assertActivePlan(sql, actor);
    if (data.inviteKind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Only the account owner can add an admin.");
    }
    const ownerId = masterUserId(actor);
    const saved = await upsertSavedInvite(sql, ownerId, data);
    if (data.inviteKind === "admin") await syncExtraAdminSeats(ownerId);
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
    await assertActivePlan(sql, actor);
    if (data.inviteKind === "admin" && actor.kind !== "cleaner") {
      throw new Error("Only the account owner can invite an admin.");
    }
    const ownerId = masterUserId(actor);
    const saved = await upsertSavedInvite(sql, ownerId, data);
    await sql`update team_invites set invited_at = now() where token = ${saved.token}`;
    if (data.inviteKind === "admin") await syncExtraAdminSeats(ownerId);
    if (data.inviteKind === "team" && data.canMessage) {
      await enableTeamAccount(sql, masterUserId(actor), "team_messaging_enabled");
    }
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
      id: string;
      master_user_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      can_message: boolean;
      accepted_at: string | null;
      invite_kind: string;
      can_charge: boolean;
      pay_type: string | null;
      pay_amount: number | null;
      pay_note: string | null;
      can_clock_in: boolean | null;
      staff_notes: string | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      emergency_name: string | null;
      emergency_phone: string | null;
      birthday: string | null;
      start_date: string | null;
      availability_json: string | null;
    }>`
      select id, master_user_id, name, email, phone, can_message, accepted_at::text as accepted_at,
             coalesce(invite_kind, 'team') as invite_kind, coalesce(can_charge, false) as can_charge,
             pay_type, pay_amount, pay_note, can_clock_in,
             staff_notes, address_line1, address_line2, city, state, zip,
             emergency_name, emergency_phone, birthday::text as birthday, start_date::text as start_date,
             availability_json
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
    if (kind === "admin") await assertAdminSeatOpen(sql, invite.master_user_id);
    const canCharge = kind === "admin" ? asBool(invite.can_charge, false) : false;
    const payType = kind === "team" ? parsePayType(invite.pay_type) : "none";
    let payAmount = kind === "team" ? Math.max(0, Math.round(Number(invite.pay_amount || 0))) : 0;
    if (payType === "none") payAmount = 0;
    if (payType === "percent") payAmount = Math.min(100, payAmount);
    const payNote = kind === "team" ? invite.pay_note : null;
    const canClockIn = kind === "team" ? invite.can_clock_in !== false : true;
    const names = namesFrom(undefined, undefined, u?.name || invite.name);
    await sql`
      insert into profiles (
        user_id, role, full_name, first_name, last_name, phone, email, cleaner_kind, master_user_id,
        can_message, team_status, can_charge, pay_type, pay_amount, pay_note, can_clock_in,
        staff_notes, address_line1, address_line2, city, state, zip,
        emergency_name, emergency_phone, birthday, start_date, availability_json
      ) values (
        ${context.userId}, ${"cleaner"}, ${names.name}, ${names.first_name || null}, ${names.last_name || null},
        ${storePhone(invite.phone)},
        ${u?.email || invite.email}, ${kind}, ${invite.master_user_id},
        ${invite.can_message}, ${"active"}, ${canCharge}, ${payType}, ${payAmount}, ${payNote}, ${canClockIn},
        ${invite.staff_notes}, ${invite.address_line1}, ${invite.address_line2}, ${invite.city}, ${invite.state}, ${invite.zip},
        ${invite.emergency_name}, ${invite.emergency_phone}, ${dateOnly(invite.birthday)}, ${dateOnly(invite.start_date)},
        ${invite.availability_json}
      )
      on conflict (user_id) do update set
        cleaner_kind = ${kind},
        master_user_id = ${invite.master_user_id},
        can_message = ${invite.can_message},
        team_status = 'active',
        role = 'cleaner',
        can_charge = ${canCharge},
        pay_type = ${payType},
        pay_amount = ${payAmount},
        pay_note = ${payNote},
        can_clock_in = ${canClockIn},
        staff_notes = ${invite.staff_notes},
        address_line1 = ${invite.address_line1},
        address_line2 = ${invite.address_line2},
        city = ${invite.city},
        state = ${invite.state},
        zip = ${invite.zip},
        emergency_name = ${invite.emergency_name},
        emergency_phone = ${invite.emergency_phone},
        birthday = ${dateOnly(invite.birthday)},
        start_date = ${dateOnly(invite.start_date)},
        availability_json = ${invite.availability_json}
    `;
    const assigned = await sql<{ client_id: string }>`
      select client_id from invite_client_assignees where invite_id = ${invite.id}
    `;
    for (const row of assigned) {
      await addMemberToClient(sql, row.client_id, context.userId);
    }
    await sql`delete from invite_client_assignees where invite_id = ${invite.id}`;
    await sql`update team_invites set accepted_at = now() where token = ${token}`;
    if (kind === "admin") await syncExtraAdminSeats(invite.master_user_id);
    return { ok: true };
  });

async function syncInviteFlag(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  inviteId: string,
  flag: "can_message" | "can_clock_in",
  enabled: boolean,
) {
  if (flag === "can_message") {
    await sql`update team_invites set can_message = ${enabled} where id = ${inviteId} and master_user_id = ${ownerId}`;
    if (enabled) {
      await enableTeamAccount(sql, ownerId, "team_messaging_enabled");
      return;
    }
    const still = await sql<{ n: number }>`
      select (
        (select count(*)::int from profiles
          where master_user_id = ${ownerId}
            and coalesce(cleaner_kind, 'team') = 'team'
            and coalesce(can_message, true) = true)
        +
        (select count(*)::int from team_invites
          where master_user_id = ${ownerId} and accepted_at is null
            and coalesce(invite_kind, 'team') = 'team'
            and coalesce(can_message, true) = true)
      ) as n
    `;
    if (Number(still[0]?.n || 0) === 0) {
      await sql`update profiles set team_messaging_enabled = ${false} where user_id = ${ownerId}`;
    }
    return;
  }
  await sql`update team_invites set can_clock_in = ${enabled} where id = ${inviteId} and master_user_id = ${ownerId}`;
  if (enabled) {
    await enableTeamAccount(sql, ownerId, "team_clock_in_enabled");
    return;
  }
  const still = await sql<{ n: number }>`
    select (
      (select count(*)::int from profiles
        where master_user_id = ${ownerId}
          and coalesce(cleaner_kind, 'team') = 'team'
          and coalesce(can_clock_in, true) = true)
      +
      (select count(*)::int from team_invites
        where master_user_id = ${ownerId} and accepted_at is null
          and coalesce(invite_kind, 'team') = 'team'
          and coalesce(can_clock_in, true) = true)
    ) as n
  `;
  if (Number(still[0]?.n || 0) === 0) {
    await sql`update profiles set team_clock_in_enabled = ${false} where user_id = ${ownerId}`;
  }
}

async function updatePendingTeamInvite(
  sql: Awaited<ReturnType<typeof getSql>>,
  actor: Awaited<ReturnType<typeof getActor>>,
  ownerId: string,
  data: {
    userId: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    canMessage?: boolean;
    assignedClientIds?: string[];
    payType?: PayType;
    payAmount?: number;
    payNote?: string;
    canCharge?: boolean;
    canClockIn?: boolean;
    details?: PersonDetailsInput;
  },
) {
  const invites = await sql<{ id: string; invite_kind: string }>`
    select id, coalesce(invite_kind, 'team') as invite_kind
    from team_invites
    where id = ${data.userId} and master_user_id = ${ownerId} and accepted_at is null
    limit 1
  `;
  const invite = invites[0];
  if (!invite) throw new Error("Person not found.");
  const kind = parseOfficeRole(invite.invite_kind);
  if (actor.kind === "admin" && kind === "admin") {
    throw new Error("Admins cannot edit other office admins.");
  }
  if (data.firstName != null || data.lastName != null || data.fullName != null) {
    const names = namesFrom(data.firstName, data.lastName, data.fullName);
    if (!names.first_name || !names.last_name) throw new Error("First and last name are required.");
    await sql`update team_invites set name = ${names.name} where id = ${invite.id}`;
  }
  if (data.phone !== undefined) {
    await sql`update team_invites set phone = ${storePhone(data.phone)} where id = ${invite.id}`;
  }
  if (data.email !== undefined) {
    const email = data.email.trim() || null;
    await sql`update team_invites set email = ${email} where id = ${invite.id}`;
  }
  if (data.canMessage != null && kind !== "admin") {
    await syncInviteFlag(sql, ownerId, invite.id, "can_message", data.canMessage);
  }
  if (data.canClockIn != null && kind !== "admin") {
    await syncInviteFlag(sql, ownerId, invite.id, "can_clock_in", data.canClockIn);
  }
  if (data.canCharge != null) {
    if (actor.kind !== "cleaner") throw new Error("Only the account owner can change charge permission.");
    if (kind !== "admin") throw new Error("Charge permission is for admins.");
    await sql`update team_invites set can_charge = ${data.canCharge} where id = ${invite.id}`;
  }
  if (data.payType !== undefined) {
    if (!(await teamPayAllowed(sql, actor))) throw new Error("Team pay is included in the Office Subscription.");
    if (kind === "admin") throw new Error("Admins do not have a team pay rate.");
    const payType = parsePayType(data.payType);
    let payAmount = Math.max(0, Math.round(Number(data.payAmount || 0)));
    if (payType === "none") payAmount = 0;
    if (payType === "percent") payAmount = Math.min(100, payAmount);
    const payNote = data.payNote?.trim() || null;
    await sql`
      update team_invites
      set pay_type = ${payType}, pay_amount = ${payAmount}, pay_note = ${payNote}
      where id = ${invite.id} and master_user_id = ${ownerId}
    `;
  }
  if (data.assignedClientIds && kind !== "admin") {
    await replaceClientAssignmentsForInvite(sql, ownerId, invite.id, data.assignedClientIds);
  }
  await savePersonDetails(sql, "invite", invite.id, ownerId, data.details);
}

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    userId: string;
    firstName?: string;
    lastName?: string;
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
    canClockIn?: boolean;
    details?: PersonDetailsInput;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
    const ownerId = masterUserId(actor);
    if (data.userId === ownerId) {
      throw new Error("The account owner cannot be changed from Team.");
    }
    const members = await sql.query<Profile>(
      `select ${PROFILE_COLUMNS} from profiles where user_id = $1 and master_user_id = $2 limit 1`,
      [data.userId, ownerId],
    );
    const member = members[0];
    if (!member) {
      await updatePendingTeamInvite(sql, actor, ownerId, data);
      return { ok: true };
    }
    if (member.cleaner_kind === "master") {
      throw new Error("The account owner cannot be changed from Team.");
    }
    if (actor.kind === "admin" && member.cleaner_kind === "admin") {
      throw new Error("Admins cannot edit other office admins.");
    }
    if (data.firstName != null || data.lastName != null || data.fullName != null) {
      const names = namesFrom(data.firstName, data.lastName, data.fullName);
      if (!names.first_name || !names.last_name) throw new Error("First and last name are required.");
      await sql`
        update profiles
        set full_name = ${names.name}, first_name = ${names.first_name}, last_name = ${names.last_name}
        where user_id = ${data.userId}
      `;
      await sql`update "user" set name = ${names.name} where id = ${data.userId}`;
    }
    if (data.phone !== undefined) {
      await sql`update profiles set phone = ${storePhone(data.phone)} where user_id = ${data.userId}`;
    }
    if (data.email !== undefined) {
      const email = data.email.trim() || null;
      await sql`update profiles set email = ${email} where user_id = ${data.userId}`;
    }
    if (data.canMessage != null && member.cleaner_kind !== "admin") {
      await setTeamPersonToggle(
        sql,
        ownerId,
        "team_messaging_enabled",
        "can_message",
        data.userId,
        data.canMessage,
      );
    }
    if (data.canClockIn != null && member.cleaner_kind !== "admin") {
      await setTeamPersonToggle(
        sql,
        ownerId,
        "team_clock_in_enabled",
        "can_clock_in",
        data.userId,
        data.canClockIn,
      );
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
      if (!(await teamPayAllowed(sql, actor))) throw new Error("Team pay is included in the Office Subscription.");
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
    await savePersonDetails(sql, "profile", data.userId, ownerId, data.details);
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
    await assertActivePlan(sql, actor);
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
    if (kind === "admin") await syncExtraAdminSeats(ownerId);
    return { token, path: `/team-invite/${token}`, name: member[0].full_name, email: member[0].email };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; pending?: boolean }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
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
        await sql`
          delete from invite_client_assignees
          where invite_id in (
            select id from team_invites where token = ${data.userId} and master_user_id = ${ownerId}
          )
        `;
        await sql`delete from team_invites where token = ${data.userId} and master_user_id = ${ownerId}`;
        if (byToken[0].invite_kind === "admin") await syncExtraAdminSeats(ownerId);
        return { ok: true, name: byToken[0].name };
      }
      if (invite[0].invite_kind === "admin" && actor.kind !== "cleaner") {
        throw new Error("Admins cannot remove an admin invite.");
      }
      await sql`delete from invite_client_assignees where invite_id = ${data.userId}`;
      await sql`delete from team_invites where id = ${data.userId} and master_user_id = ${ownerId}`;
      if (invite[0].invite_kind === "admin") await syncExtraAdminSeats(ownerId);
      return { ok: true, name: invite[0].name };
    }
    const member = await sql<{ full_name: string; cleaner_kind: string | null; email: string | null }>`
      select full_name, cleaner_kind, lower(email) as email from profiles
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
    if (member[0].cleaner_kind === "admin") {
      const email = (member[0].email || "").trim();
      if (email) {
        await sql`
          delete from team_invites
          where master_user_id = ${ownerId}
            and accepted_at is null
            and coalesce(invite_kind, 'team') = 'admin'
            and lower(email) = ${email}
        `;
      }
      await syncExtraAdminSeats(ownerId);
    }
    return { ok: true, name: member[0].full_name };
  });

export const setTeamMessaging = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((enabled: boolean) => Boolean(enabled))
  .handler(async ({ context, data: enabled }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
    await setTeamAccountToggle(
      sql,
      masterUserId(actor),
      "team_messaging_enabled",
      "can_message",
      enabled,
    );
    return { ok: true };
  });

export const setTeamClockIn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((enabled: boolean) => Boolean(enabled))
  .handler(async ({ context, data: enabled }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
    await setTeamAccountToggle(
      sql,
      masterUserId(actor),
      "team_clock_in_enabled",
      "can_clock_in",
      enabled,
    );
    return { ok: true };
  });

export const setTeamMemberClockIn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; enabled: boolean }) => ({
    userId: input.userId,
    enabled: Boolean(input.enabled),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
    const ownerId = masterUserId(actor);
    const member = await sql<{ user_id: string }>`
      select user_id from profiles
      where user_id = ${data.userId}
        and master_user_id = ${ownerId}
        and coalesce(cleaner_kind, ${"team"}) = ${"team"}
      limit 1
    `;
    if (!member[0]) throw new Error("Team cleaner not found.");
    await setTeamPersonToggle(
      sql,
      ownerId,
      "team_clock_in_enabled",
      "can_clock_in",
      data.userId,
      data.enabled,
    );
    return { ok: true };
  });
