import type { Sql } from "@/lib/db";
import type { Actor, ClientRow, Profile } from "./types";

export const PROFILE_COLUMNS = `
  user_id, role, full_name, business_name, phone, email, address, cancellation_policy,
  default_duration_min, default_rate_cents, cleaner_kind, master_user_id, can_message,
  team_status, team_messaging_enabled, email_reminders, reminder_email_team,
  plan_status, plan_price_cents,
  created_at::text as created_at
`;

export const JOB_SELECT = `
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

export const JOB_FROM = `
  jobs j
  join clients c on c.id = j.client_id
  left join profiles assignee on assignee.user_id = j.assigned_to_user_id
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
    email_reminders: asBool(row.email_reminders, true),
    reminder_email_team: asBool(row.reminder_email_team, false),
    cleaner_kind: row.cleaner_kind || (row.role === "cleaner" ? "master" : null),
    plan_status: row.plan_status || "trial",
    plan_price_cents: Number(row.plan_price_cents || 1900),
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
    if (profile.cleaner_kind === "team" || profile.master_user_id) {
      const masterId = profile.master_user_id || userId;
      const masterRows = await sql.query<{ team_messaging_enabled: boolean }>(
        `select team_messaging_enabled from profiles where user_id = $1 limit 1`,
        [masterId],
      );
      const accountMsg = asBool(masterRows[0]?.team_messaging_enabled, true);
      return {
        kind: "team",
        userId,
        profile,
        masterUserId: masterId,
        canMessage: asBool(profile.can_message, true) && accountMsg,
        disabled: profile.team_status === "disabled",
      };
    }
    return { kind: "cleaner", userId, profile, masterUserId: userId };
  }

  const clients = await sql<ClientRow>`
    select id, cleaner_user_id, linked_user_id, name, phone, email, address,
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

export function assertStaff(
  actor: Actor,
): asserts actor is Extract<Actor, { kind: "cleaner" | "team" }> {
  if (actor.kind === "team" && actor.disabled) {
    throw new Error("This team login is disabled.");
  }
  if (actor.kind !== "cleaner" && actor.kind !== "team") {
    throw new Error("This action is only available to cleaners.");
  }
}

export function assertClient(actor: Actor): asserts actor is Extract<Actor, { kind: "client" }> {
  if (actor.kind !== "client") {
    throw new Error("This action is only available to clients.");
  }
}

export function masterUserId(actor: Actor): string {
  if (actor.kind === "cleaner") return actor.masterUserId;
  if (actor.kind === "team") return actor.masterUserId;
  if (actor.kind === "client") return actor.client.cleaner_user_id;
  throw new Error("No business account on this login.");
}

export function canMessageClients(actor: Actor) {
  if (actor.kind === "cleaner") return true;
  if (actor.kind === "team") return actor.canMessage && !actor.disabled;
  return actor.kind === "client";
}
