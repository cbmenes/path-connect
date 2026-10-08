import type { Sql } from "@/lib/db";

type AccountFlag = "team_messaging_enabled" | "team_checklists_enabled" | "team_clock_in_enabled";
type PersonFlag = "can_message" | "can_see_checklists" | "can_clock_in";

async function setAccountFlag(sql: Sql, ownerId: string, flag: AccountFlag, enabled: boolean) {
  if (flag === "team_messaging_enabled") {
    await sql`update profiles set team_messaging_enabled = ${enabled} where user_id = ${ownerId}`;
  } else if (flag === "team_checklists_enabled") {
    await sql`update profiles set team_checklists_enabled = ${enabled} where user_id = ${ownerId}`;
  } else {
    await sql`update profiles set team_clock_in_enabled = ${enabled} where user_id = ${ownerId}`;
  }
}

async function setAllTeamPeople(sql: Sql, ownerId: string, flag: PersonFlag, enabled: boolean) {
  if (flag === "can_message") {
    await sql`
      update profiles set can_message = ${enabled}
      where master_user_id = ${ownerId} and coalesce(cleaner_kind, ${"team"}) = ${"team"}
    `;
    await sql`
      update team_invites set can_message = ${enabled}
      where master_user_id = ${ownerId} and accepted_at is null
        and coalesce(invite_kind, ${"team"}) = ${"team"}
    `;
    return;
  }
  if (flag === "can_see_checklists") {
    await sql`
      update profiles set can_see_checklists = ${enabled}
      where master_user_id = ${ownerId} and coalesce(cleaner_kind, ${"team"}) = ${"team"}
    `;
    return;
  }
  await sql`
    update profiles set can_clock_in = ${enabled}
    where master_user_id = ${ownerId} and coalesce(cleaner_kind, ${"team"}) = ${"team"}
  `;
  await sql`
    update team_invites set can_clock_in = ${enabled}
    where master_user_id = ${ownerId} and accepted_at is null
      and coalesce(invite_kind, ${"team"}) = ${"team"}
  `;
}

async function anyTeamPersonOn(sql: Sql, ownerId: string, flag: PersonFlag) {
  if (flag === "can_message") {
    const rows = await sql<{ n: number }>`
      select (
        (select count(*)::int from profiles
          where master_user_id = ${ownerId}
            and coalesce(cleaner_kind, ${"team"}) = ${"team"}
            and coalesce(can_message, true) = true)
        +
        (select count(*)::int from team_invites
          where master_user_id = ${ownerId} and accepted_at is null
            and coalesce(invite_kind, ${"team"}) = ${"team"}
            and coalesce(can_message, true) = true)
      ) as n
    `;
    return Number(rows[0]?.n || 0) > 0;
  }
  if (flag === "can_see_checklists") {
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from profiles
      where master_user_id = ${ownerId}
        and coalesce(cleaner_kind, ${"team"}) = ${"team"}
        and coalesce(can_see_checklists, true) = true
    `;
    return Number(rows[0]?.n || 0) > 0;
  }
  const rows = await sql<{ n: number }>`
    select (
      (select count(*)::int from profiles
        where master_user_id = ${ownerId}
          and coalesce(cleaner_kind, ${"team"}) = ${"team"}
          and coalesce(can_clock_in, true) = true)
      +
      (select count(*)::int from team_invites
        where master_user_id = ${ownerId} and accepted_at is null
          and coalesce(invite_kind, ${"team"}) = ${"team"}
          and coalesce(can_clock_in, true) = true)
    ) as n
  `;
  return Number(rows[0]?.n || 0) > 0;
}

export async function enableTeamAccount(sql: Sql, ownerId: string, account: AccountFlag) {
  await setAccountFlag(sql, ownerId, account, true);
}

/** Blanket off turns every cleaner off. Blanket on turns every cleaner on. */
export async function setTeamAccountToggle(
  sql: Sql,
  ownerId: string,
  account: AccountFlag,
  person: PersonFlag,
  enabled: boolean,
) {
  await setAccountFlag(sql, ownerId, account, enabled);
  await setAllTeamPeople(sql, ownerId, person, enabled);
}

/** Turning one cleaner on turns the account on. If the last cleaner is off, the account goes off. */
export async function setTeamPersonToggle(
  sql: Sql,
  ownerId: string,
  account: AccountFlag,
  person: PersonFlag,
  userId: string,
  enabled: boolean,
) {
  if (person === "can_message") {
    await sql`update profiles set can_message = ${enabled} where user_id = ${userId} and master_user_id = ${ownerId}`;
  } else if (person === "can_see_checklists") {
    await sql`update profiles set can_see_checklists = ${enabled} where user_id = ${userId} and master_user_id = ${ownerId}`;
  } else {
    await sql`update profiles set can_clock_in = ${enabled} where user_id = ${userId} and master_user_id = ${ownerId}`;
  }
  if (enabled) {
    await setAccountFlag(sql, ownerId, account, true);
    return;
  }
  if (!(await anyTeamPersonOn(sql, ownerId, person))) {
    await setAccountFlag(sql, ownerId, account, false);
  }
}
