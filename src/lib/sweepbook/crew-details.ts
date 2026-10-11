import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor, masterUserId } from "./access";
import { hitForVisit, outsideAvailability, parseAvailabilityJson, type AvailabilityHit, type CrewDatePerson } from "./availability";

export async function findAvailabilityHits(
  sql: Sql,
  ownerId: string,
  visits: { start: Date; durationMin: number }[],
  userIds: string[],
): Promise<AvailabilityHit[]> {
  const mine = [...new Set(userIds.filter(Boolean))];
  if (!mine.length || !visits.length) return [];
  const placeholders = mine.map((_, i) => `$${i + 2}`).join(", ");
  const rows = await sql.query<{ user_id: string; full_name: string; availability_json: string | null }>(
    `select user_id, full_name, availability_json
     from profiles
     where master_user_id = $1 and user_id in (${placeholders})
       and coalesce(cleaner_kind, 'team') <> 'admin'
     union all
     select id as user_id, name as full_name, availability_json
     from team_invites
     where master_user_id = $1 and accepted_at is null and id in (${placeholders})
       and coalesce(invite_kind, 'team') <> 'admin'`,
    [ownerId, ...mine],
  );
  const hits: AvailabilityHit[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const windows = parseAvailabilityJson(row.availability_json);
    if (!windows.length) continue;
    for (const visit of visits) {
      if (!outsideAvailability(visit.start, visit.durationMin, windows)) continue;
      const key = `${row.user_id}|${visit.start.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(hitForVisit(row.full_name, row.user_id, visit.start, windows));
    }
  }
  return hits;
}

export const listCrewMarks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CrewDatePerson[]> => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (!actor || (actor.kind !== "cleaner" && actor.kind !== "admin" && actor.kind !== "team")) return [];
    const ownerId = masterUserId(actor);
    const people = await sql.query<{ user_id: string; full_name: string; birthday: string | null; start_date: string | null }>(
      `select user_id, full_name, birthday::text as birthday, start_date::text as start_date
       from profiles
       where master_user_id = $1
         and role = 'cleaner'
         and coalesce(cleaner_kind, 'team') in ('team', 'admin')
         and (birthday is not null or start_date is not null)
       order by full_name`,
      [ownerId],
    );
    const pending = await sql.query<{ user_id: string; full_name: string; birthday: string | null; start_date: string | null }>(
      `select id as user_id, name as full_name, birthday::text as birthday, start_date::text as start_date
       from team_invites
       where master_user_id = $1
         and accepted_at is null
         and (birthday is not null or start_date is not null)
       order by name`,
      [ownerId],
    );
    const marks = [...people, ...pending].map((row) => ({
      userId: row.user_id,
      name: row.full_name,
      birthday: dateOnly(row.birthday),
      startDate: dateOnly(row.start_date),
    }));
    if (actor.kind === "team") return marks.filter((row) => row.userId !== actor.userId);
    return marks;
  });

function dateOnly(raw: string | null) {
  if (!raw) return null;
  const value = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
