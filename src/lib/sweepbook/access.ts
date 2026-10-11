import type { Sql } from "@/lib/db";
import { subscriptionAccessLocked } from "./plan-prices";
import { isDemoAccountEmail, type Actor, type ClientRow, type Profile, type PlanStatus } from "./types";

export const PROFILE_COLUMNS = `
  user_id, role, full_name, first_name, last_name, business_name, phone, email, address,
  address_line1, address_line2, city, state, zip, booking_slug, cancellation_policy,
  default_duration_min, default_rate_cents, cleaner_kind, master_user_id, can_message,
  team_status, team_messaging_enabled, team_checklists_enabled, team_clock_in_enabled,
  coalesce(can_see_checklists, true) as can_see_checklists,
  coalesce(can_clock_in, true) as can_clock_in,
  email_reminders, reminder_email_team,
  coalesce(can_charge, false) as can_charge,
  plan_status, plan_price_cents, plan_code, billing_interval,
  current_period_end::text as current_period_end,
  coalesce(cancel_at_period_end, false) as cancel_at_period_end,
  stripe_customer_id, stripe_subscription_id, stripe_account_id,
  created_at::text as created_at
`;

export const JOB_SELECT = `
  j.id, j.cleaner_user_id, j.client_id, j.service, j.address,
  j.address_line1, j.address_line2, j.city, j.state, j.zip,
  j.start_at::text as start_at, j.duration_min, j.price_cents, j.notes, j.status,
  j.recurrence, j.series_id, j.cancel_reason, j.reschedule_note,
  j.reschedule_requested_at::text as reschedule_requested_at,
  j.assigned_to_user_id, j.tip_cents, j.tip_requested, j.created_at::text as created_at,
  j.checklist_template_id, j.progress_status,
  j.on_the_way_at::text as on_the_way_at, j.started_at::text as started_at,
  j.finished_at::text as finished_at,
  c.name as client_name, c.phone as client_phone, c.notes as client_notes,
  coalesce(
    assignee.full_name,
    (select case when ti.invited_at is null then ti.name || ' · Saved' else ti.name || ' · Invite pending' end
     from team_invites ti
     where ti.id = j.assigned_to_user_id and ti.accepted_at is null
     limit 1)
  ) as assignee_name,
  (select coalesce(json_agg(json_build_object('user_id', assigned.user_id, 'full_name', assigned.full_name) order by assigned.full_name), '[]'::json)
     from (
       select p.user_id, p.full_name
       from job_assignees ja
       join profiles p on p.user_id = ja.user_id
       where ja.job_id = j.id
       union all
       select i.id as user_id,
              case when i.invited_at is null then i.name || ' · Saved' else i.name || ' · Invite pending' end as full_name
       from job_assignees ja
       join team_invites i on i.id = ja.user_id
       where ja.job_id = j.id and i.accepted_at is null
     ) assigned) as assignees_json,
  pay.status as payment_status,
  pay.paid_at::text as payment_paid_at,
  pay.method as payment_method,
  pay.paid_note as payment_note
`;

export const JOB_FROM = `
  jobs j
  join clients c on c.id = j.client_id
  left join profiles assignee on assignee.user_id = j.assigned_to_user_id
  left join lateral (
    select i.status, i.paid_at, i.method, i.paid_note
    from invoices i
    where i.job_id = j.id and i.kind = 'visit'
    order by case when i.status = 'paid' then 0 else 1 end, i.created_at desc
    limit 1
  ) pay on true
`;

function asBool(v: unknown, fallback = false) {
  if (v === true || v === "t" || v === "true") return true;
  if (v === false || v === "f" || v === "false") return false;
  return fallback;
}

function normalizeProfile(row: Profile): Profile {
  return {
    ...row,
    can_message: asBool(row.can_message, true),
    team_messaging_enabled: asBool(row.team_messaging_enabled, true),
    team_checklists_enabled: asBool(row.team_checklists_enabled, true),
    team_clock_in_enabled: asBool(row.team_clock_in_enabled, true),
    can_see_checklists: asBool(row.can_see_checklists, true),
    can_clock_in: asBool(row.can_clock_in, true),
    email_reminders: asBool(row.email_reminders, true),
    reminder_email_team: asBool(row.reminder_email_team, false),
    can_charge: asBool(row.can_charge, false),
    cleaner_kind: row.cleaner_kind || (row.role === "cleaner" ? "master" : null),
    plan_status: row.plan_status || "trial",
    plan_price_cents: Number(row.plan_price_cents || 1900),
    plan_code: row.plan_code === "crew" || row.plan_code === "office" ? row.plan_code : null,
    billing_interval: row.billing_interval === "year" ? "year" : row.billing_interval === "month" ? "month" : null,
    current_period_end: row.current_period_end || null,
    cancel_at_period_end: asBool(row.cancel_at_period_end, false),
    stripe_customer_id: row.stripe_customer_id || null,
    stripe_subscription_id: row.stripe_subscription_id || null,
    stripe_account_id: row.stripe_account_id || null,
  };
}

export async function getActor(sql: Sql, userId: string): Promise<Actor> {
  const profiles = await sql.query<Profile>(
    `select ${PROFILE_COLUMNS} from profiles where user_id = $1 limit 1`,
    [userId],
  );
  const raw = profiles[0];
  if (!raw) return { kind: "none", userId };
  const profile = normalizeProfile(raw);

  if (profile.role === "cleaner") {
    if (profile.cleaner_kind === "admin") {
      const masterId = profile.master_user_id || userId;
      const masterPlan = await sql.query<{
        plan_status: string | null;
        cancel_at_period_end: boolean | null;
        current_period_end: string | null;
      }>(
        `select plan_status, coalesce(cancel_at_period_end, false) as cancel_at_period_end,
                current_period_end::text as current_period_end
         from profiles where user_id = $1 limit 1`,
        [masterId],
      );
      const masterPlanStatus = (masterPlan[0]?.plan_status || "trial") as PlanStatus;
      return {
        kind: "admin",
        userId,
        profile,
        masterUserId: masterId,
        masterPlanStatus,
        masterCancelAtPeriodEnd: asBool(masterPlan[0]?.cancel_at_period_end, false),
        masterPeriodEnd: masterPlan[0]?.current_period_end || null,
        canCharge: asBool(profile.can_charge, false),
        canMessage: true,
        disabled: profile.team_status === "disabled",
      };
    }
    if (profile.cleaner_kind === "team" || profile.master_user_id) {
      const masterId = profile.master_user_id || userId;
      const masterRows = await sql.query<{
        team_messaging_enabled: boolean;
        team_checklists_enabled: boolean;
        team_clock_in_enabled: boolean;
      }>(
        `select team_messaging_enabled, team_checklists_enabled, team_clock_in_enabled
         from profiles where user_id = $1 limit 1`,
        [masterId],
      );
      const accountMsg = asBool(masterRows[0]?.team_messaging_enabled, true);
      const accountChecklists = asBool(masterRows[0]?.team_checklists_enabled, true);
      const accountClockIn = asBool(masterRows[0]?.team_clock_in_enabled, true);
      return {
        kind: "team",
        userId,
        profile,
        masterUserId: masterId,
        canMessage: asBool(profile.can_message, true) && accountMsg,
        canSeeChecklists: asBool(profile.can_see_checklists, true) && accountChecklists,
        canClockIn: asBool(profile.can_clock_in, true) && accountClockIn,
        disabled: profile.team_status === "disabled",
      };
    }
    return { kind: "cleaner", userId, profile, masterUserId: userId };
  }

  const clients = await sql<ClientRow>`
    select id, cleaner_user_id, linked_user_id, name, first_name, last_name, phone, email, address,
           address_line1, address_line2, city, state, zip, bedrooms, bathrooms, square_footage,
           access_notes, pets, supplies, default_price_cents, default_duration_min,
           usual_day, usual_time, frequency, notes, created_at::text as created_at
    from clients where linked_user_id = ${userId} limit 1
  `;
  const client = clients[0];
  if (!client) return { kind: "client_unlinked", userId, profile };

  const cleaner = await sql<{ full_name: string; business_name: string | null }>`
    select full_name, business_name from profiles where user_id = ${client.cleaner_user_id} limit 1
  `;
  const cleanerName = cleaner[0]?.business_name || cleaner[0]?.full_name || "Your cleaner";
  return { kind: "client", userId, profile, client, cleanerName };
}

export function assertCleaner(actor: Actor): asserts actor is Extract<Actor, { kind: "cleaner" }> {
  if (actor.kind !== "cleaner") {
    throw new Error("This action is only available to the account owner.");
  }
}

export function isOffice(actor: Actor): actor is Extract<Actor, { kind: "cleaner" | "admin" }> {
  return actor.kind === "cleaner" || actor.kind === "admin";
}

export function assertOffice(
  actor: Actor,
): asserts actor is Extract<Actor, { kind: "cleaner" | "admin" }> {
  if (actor.kind === "admin" && actor.disabled) {
    throw new Error("This admin login is disabled.");
  }
  if (actor.kind !== "cleaner" && actor.kind !== "admin") {
    throw new Error("This action is only available to the office.");
  }
}

export function canChargeClients(actor: Actor) {
  if (actor.kind === "cleaner") return true;
  if (actor.kind === "admin") return actor.canCharge && !actor.disabled;
  return false;
}

export function assertCanCharge(actor: Actor) {
  assertOffice(actor);
  if (!canChargeClients(actor)) {
    throw new Error("Charging is off for this admin login.");
  }
}

export function subscriptionInactive(input: {
  status: string | null | undefined;
  cancelAtPeriodEnd?: boolean | null;
  periodEnd?: string | null;
  now?: number;
}) {
  return subscriptionAccessLocked(input);
}

export async function assertActivePlan(sql: Sql, actor: Actor) {
  if (actor.kind !== "cleaner" && actor.kind !== "admin") return;
  const masterId = actor.masterUserId;
  const emails = await sql<{ email: string | null }>`
    select email from "user" where id = ${actor.userId} or id = ${masterId}
  `;
  if (emails.some((row) => isDemoAccountEmail(row.email))) return;
  const rows = await sql<{
    plan_status: string | null;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null;
  }>`
    select plan_status, coalesce(cancel_at_period_end, false) as cancel_at_period_end,
           current_period_end::text as current_period_end
    from profiles where user_id = ${masterId} limit 1
  `;
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

export function assertStaff(
  actor: Actor,
): asserts actor is Extract<Actor, { kind: "cleaner" | "admin" | "team" }> {
  if ((actor.kind === "team" || actor.kind === "admin") && actor.disabled) {
    throw new Error("This login is disabled.");
  }
  if (actor.kind !== "cleaner" && actor.kind !== "admin" && actor.kind !== "team") {
    throw new Error("This action is only available to the office or team.");
  }
}

export function assertClient(actor: Actor): asserts actor is Extract<Actor, { kind: "client" }> {
  if (actor.kind !== "client") {
    throw new Error("This action is only available to clients.");
  }
}

export function masterUserId(actor: Actor): string {
  if (actor.kind === "cleaner") return actor.masterUserId;
  if (actor.kind === "admin") return actor.masterUserId;
  if (actor.kind === "team") return actor.masterUserId;
  if (actor.kind === "client") return actor.client.cleaner_user_id;
  throw new Error("No business account on this login.");
}

export function canMessageClients(actor: Actor) {
  if (actor.kind === "cleaner" || actor.kind === "admin") return true;
  if (actor.kind === "team") return actor.canMessage && !actor.disabled;
  return actor.kind === "client";
}

export function teamCanSeeChecklists(actor: Actor) {
  return actor.kind === "team" && !actor.disabled && actor.canSeeChecklists;
}

export function teamCanClockIn(actor: Actor) {
  return actor.kind === "team" && !actor.disabled && actor.canClockIn;
}
