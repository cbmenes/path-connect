import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { canMessageClients, getActor, isOffice, masterUserId } from "./access";
import { teamCanAccessClient } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import {
  encodeThreadId,
  parseThreadId,
  threadStorage,
  type ThreadRef,
} from "./threads";
import type { Actor, MessageRecipient, MessageRow, ThreadSummary } from "./types";

type Access = {
  ownerId: string;
  ref: ThreadRef;
  teamName?: string;
  adminName?: string;
};

async function requireOwnedClient(sql: Sql, ownerId: string, clientId: string) {
  const owned = await sql`select id from clients where id = ${clientId} and cleaner_user_id = ${ownerId} limit 1`;
  if (!owned[0]) throw new Error("Thread not found.");
}

async function requireTeam(sql: Sql, ownerId: string, teamUserId: string) {
  const team = await sql<{ user_id: string; full_name: string; can_message: boolean }>`
    select user_id, full_name, can_message from profiles
    where user_id = ${teamUserId} and master_user_id = ${ownerId} and role = 'cleaner'
      and coalesce(cleaner_kind, 'team') = 'team'
    limit 1
  `;
  if (!team[0]) throw new Error("Thread not found.");
  return team[0];
}

async function requireAdmin(sql: Sql, ownerId: string, adminUserId: string) {
  const admin = await sql<{ user_id: string; full_name: string }>`
    select user_id, full_name from profiles
    where user_id = ${adminUserId} and master_user_id = ${ownerId} and role = 'cleaner'
      and coalesce(cleaner_kind, '') = 'admin'
    limit 1
  `;
  if (!admin[0]) throw new Error("Thread not found.");
  return admin[0];
}

async function assertThreadAccess(sql: Sql, actor: Actor, thread: ThreadRef): Promise<Access> {
  if (actor.kind === "none" || actor.kind === "client_unlinked") {
    throw new Error("Thread not found.");
  }
  const ownerId = masterUserId(actor);

  if (thread.channel === "master_client") {
    if (!thread.clientId) throw new Error("Thread not found.");
    if (actor.kind === "team" || actor.kind === "admin") throw new Error("Thread not found.");
    if (actor.kind === "client") {
      if (actor.client.id !== thread.clientId) throw new Error("Thread not found.");
      return { ownerId, ref: thread };
    }
    await requireOwnedClient(sql, ownerId, thread.clientId);
    return { ownerId, ref: thread };
  }

  if (thread.channel === "team_client") {
    if (!thread.clientId || !thread.teamUserId) throw new Error("Thread not found.");
    if (actor.kind === "admin") throw new Error("Thread not found.");
    const team = await requireTeam(sql, ownerId, thread.teamUserId);
    const master = await sql<{ team_messaging_enabled: boolean }>`
      select team_messaging_enabled from profiles where user_id = ${ownerId} limit 1
    `;
    const messagingOn = Boolean(master[0]?.team_messaging_enabled) && Boolean(team.can_message);
    if (actor.kind === "client") {
      if (actor.client.id !== thread.clientId || !messagingOn) throw new Error("Thread not found.");
      return { ownerId, ref: thread, teamName: team.full_name };
    }
    if (actor.kind === "team") {
      if (actor.userId !== thread.teamUserId || !canMessageClients(actor)) throw new Error("Thread not found.");
      const allowed = await teamCanAccessClient(sql, actor.userId, thread.clientId);
      if (!allowed) throw new Error("Thread not found.");
      return { ownerId, ref: thread, teamName: team.full_name };
    }
    await requireOwnedClient(sql, ownerId, thread.clientId);
    return { ownerId, ref: thread, teamName: team.full_name };
  }

  if (thread.channel === "master_team") {
    if (!thread.teamUserId) throw new Error("Thread not found.");
    if (actor.kind === "client" || actor.kind === "admin") throw new Error("Thread not found.");
    const team = await requireTeam(sql, ownerId, thread.teamUserId);
    if (actor.kind === "team" && actor.userId !== thread.teamUserId) throw new Error("Thread not found.");
    return { ownerId, ref: thread, teamName: team.full_name };
  }

  if (thread.channel === "admin_client") {
    if (!thread.clientId || !thread.adminUserId) throw new Error("Thread not found.");
    if (actor.kind === "team") throw new Error("Thread not found.");
    const admin = await requireAdmin(sql, ownerId, thread.adminUserId);
    if (actor.kind === "client") {
      if (actor.client.id !== thread.clientId) throw new Error("Thread not found.");
      return { ownerId, ref: thread, adminName: admin.full_name };
    }
    if (actor.kind === "admin" && actor.userId !== thread.adminUserId) throw new Error("Thread not found.");
    await requireOwnedClient(sql, ownerId, thread.clientId);
    return { ownerId, ref: thread, adminName: admin.full_name };
  }

  if (thread.channel === "master_admin") {
    if (!thread.adminUserId) throw new Error("Thread not found.");
    if (actor.kind === "client" || actor.kind === "team") throw new Error("Thread not found.");
    const admin = await requireAdmin(sql, ownerId, thread.adminUserId);
    if (actor.kind === "admin" && actor.userId !== thread.adminUserId) throw new Error("Thread not found.");
    return { ownerId, ref: thread, adminName: admin.full_name };
  }

  if (thread.channel === "admin_team") {
    if (!thread.adminUserId || !thread.teamUserId) throw new Error("Thread not found.");
    if (actor.kind === "client") throw new Error("Thread not found.");
    const admin = await requireAdmin(sql, ownerId, thread.adminUserId);
    const team = await requireTeam(sql, ownerId, thread.teamUserId);
    if (actor.kind === "admin" && actor.userId !== thread.adminUserId) throw new Error("Thread not found.");
    if (actor.kind === "team" && actor.userId !== thread.teamUserId) throw new Error("Thread not found.");
    return { ownerId, ref: thread, adminName: admin.full_name, teamName: team.full_name };
  }

  throw new Error("Thread not found.");
}

async function markThreadRead(sql: Sql, userId: string, ownerId: string, thread: ThreadRef) {
  const store = threadStorage(thread);
  if (thread.channel === "master_client") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'master_client'
        and m.client_id = ${thread.clientId}
        and m.team_user_id is null
      on conflict do nothing
    `;
    return;
  }
  if (thread.channel === "team_client") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'team_client'
        and m.client_id = ${thread.clientId}
        and m.team_user_id = ${thread.teamUserId}
      on conflict do nothing
    `;
    return;
  }
  if (thread.channel === "master_team") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'master_team'
        and m.team_user_id = ${thread.teamUserId}
        and m.client_id is null
      on conflict do nothing
    `;
    return;
  }
  if (thread.channel === "admin_client") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'admin_client'
        and m.client_id = ${thread.clientId}
        and m.team_user_id = ${store.teamUserId}
      on conflict do nothing
    `;
    return;
  }
  if (thread.channel === "master_admin") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'master_admin'
        and m.team_user_id = ${store.teamUserId}
        and m.client_id is null
      on conflict do nothing
    `;
    return;
  }
  await sql`
    insert into message_reads (message_id, user_id)
    select m.id, ${userId} from messages m
    where m.cleaner_user_id = ${ownerId}
      and m.channel = 'admin_team'
      and m.team_user_id = ${store.teamUserId}
      and m.admin_user_id = ${store.adminUserId}
      and m.client_id is null
    on conflict do nothing
  `;
}

const MSG_SELECT = `
  id, cleaner_user_id, client_id, sender_role, body,
  created_at::text as created_at, read_at::text as read_at,
  channel, team_user_id, sender_user_id, sender_name
`;

function sortThreads(rows: ThreadSummary[]) {
  rows.sort((a, b) => {
    if (!a.last_at && b.last_at) return 1;
    if (a.last_at && !b.last_at) return -1;
    if (a.last_at === b.last_at) return (a.title || "").localeCompare(b.title || "");
    return a.last_at < b.last_at ? 1 : -1;
  });
  return rows.map((r) => ({
    ...r,
    unread: Number(r.unread || 0),
    subtitle: r.subtitle ?? null,
  }));
}

async function loadMasterClientThreads(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('mc--' || c.id) as thread_id, c.name as title, 'Client' as subtitle,
            coalesce(last.body, '') as last_body,
            coalesce(last.created_at::text, c.created_at::text) as last_at,
            coalesce(u.unread, 0)::int as unread
     from clients c
     left join lateral (
       select body, created_at from messages m
       where m.client_id = c.id and m.cleaner_user_id = $1
         and m.channel = 'master_client' and m.team_user_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.client_id = c.id and m.cleaner_user_id = $1
         and m.channel = 'master_client' and m.team_user_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where c.cleaner_user_id = $1
     order by last.created_at desc nulls last, c.name`,
    [ownerId, userId],
  );
}

async function loadTeamClientOfficeThreads(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('tc--' || t.team_user_id || '--' || t.client_id) as thread_id,
            c.name as title, p.full_name as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from (
       select distinct client_id, team_user_id from messages
       where cleaner_user_id = $1 and channel = 'team_client'
         and client_id is not null and team_user_id is not null
     ) t
     join clients c on c.id = t.client_id
     join profiles p on p.user_id = t.team_user_id
     join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'team_client'
         and m.client_id = t.client_id and m.team_user_id = t.team_user_id
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'team_client'
         and m.client_id = t.client_id and m.team_user_id = t.team_user_id
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where coalesce(p.cleaner_kind, 'team') = 'team'
     order by last.created_at desc`,
    [ownerId, userId],
  );
}

async function loadMasterTeamThreads(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('mt--' || p.user_id) as thread_id, p.full_name as title, 'Team' as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from profiles p
     left join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_team'
         and m.team_user_id = p.user_id and m.client_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_team'
         and m.team_user_id = p.user_id and m.client_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where p.master_user_id = $1 and p.role = 'cleaner'
       and coalesce(p.cleaner_kind, 'team') = 'team'
     order by last.created_at desc nulls last, p.full_name`,
    [ownerId, userId],
  );
}

async function loadAdminClientExisting(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('ac--' || t.admin_id || '--' || t.client_id) as thread_id,
            c.name as title, p.full_name as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from (
       select distinct client_id, coalesce(admin_user_id, team_user_id) as admin_id
       from messages
       where cleaner_user_id = $1 and channel = 'admin_client'
         and client_id is not null
     ) t
     join clients c on c.id = t.client_id
     join profiles p on p.user_id = t.admin_id
     join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_client'
         and m.client_id = t.client_id
         and coalesce(m.admin_user_id, m.team_user_id) = t.admin_id
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_client'
         and m.client_id = t.client_id
         and coalesce(m.admin_user_id, m.team_user_id) = t.admin_id
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where coalesce(p.cleaner_kind, '') = 'admin'
     order by last.created_at desc`,
    [ownerId, userId],
  );
}

async function loadAdminClientForAdmin(sql: Sql, ownerId: string, adminUserId: string) {
  return sql.query<ThreadSummary>(
    `select ('ac--' || $2 || '--' || c.id) as thread_id, c.name as title, 'Client' as subtitle,
            coalesce(last.body, '') as last_body,
            coalesce(last.created_at::text, c.created_at::text) as last_at,
            coalesce(u.unread, 0)::int as unread
     from clients c
     left join lateral (
       select body, created_at from messages m
       where m.client_id = c.id and m.cleaner_user_id = $1
         and m.channel = 'admin_client'
         and coalesce(m.admin_user_id, m.team_user_id) = $2
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.client_id = c.id and m.cleaner_user_id = $1
         and m.channel = 'admin_client'
         and coalesce(m.admin_user_id, m.team_user_id) = $2
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where c.cleaner_user_id = $1
     order by last.created_at desc nulls last, c.name`,
    [ownerId, adminUserId],
  );
}

async function loadMasterAdminForMaster(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('ma--' || p.user_id) as thread_id, p.full_name as title, 'Admin' as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from profiles p
     left join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_admin'
         and coalesce(m.admin_user_id, m.team_user_id) = p.user_id and m.client_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_admin'
         and coalesce(m.admin_user_id, m.team_user_id) = p.user_id and m.client_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where p.master_user_id = $1 and p.role = 'cleaner'
       and coalesce(p.cleaner_kind, '') = 'admin'
       and coalesce(p.team_status, 'active') <> 'disabled'
     order by last.created_at desc nulls last, p.full_name`,
    [ownerId, userId],
  );
}

async function loadMasterAdminForAdmin(sql: Sql, ownerId: string, adminUserId: string) {
  return sql.query<ThreadSummary>(
    `select ('ma--' || $2) as thread_id,
            coalesce(p.business_name, p.full_name) as title,
            'Owner' as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from profiles p
     left join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_admin'
         and coalesce(m.admin_user_id, m.team_user_id) = $2 and m.client_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_admin'
         and coalesce(m.admin_user_id, m.team_user_id) = $2 and m.client_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where p.user_id = $1`,
    [ownerId, adminUserId],
  );
}

async function loadAdminTeamExisting(sql: Sql, ownerId: string, userId: string) {
  return sql.query<ThreadSummary>(
    `select ('at--' || t.admin_id || '--' || t.team_id) as thread_id,
            team.full_name as title, admin.full_name as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from (
       select distinct team_user_id as team_id, coalesce(admin_user_id, '') as admin_id
       from messages
       where cleaner_user_id = $1 and channel = 'admin_team'
         and team_user_id is not null and admin_user_id is not null
     ) t
     join profiles team on team.user_id = t.team_id
     join profiles admin on admin.user_id = t.admin_id
     join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_team'
         and m.team_user_id = t.team_id and m.admin_user_id = t.admin_id
         and m.client_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_team'
         and m.team_user_id = t.team_id and m.admin_user_id = t.admin_id
         and m.client_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where coalesce(team.cleaner_kind, 'team') = 'team'
       and coalesce(admin.cleaner_kind, '') = 'admin'
     order by last.created_at desc`,
    [ownerId, userId],
  );
}

async function loadAdminTeamForAdmin(sql: Sql, ownerId: string, adminUserId: string) {
  return sql.query<ThreadSummary>(
    `select ('at--' || $2 || '--' || p.user_id) as thread_id, p.full_name as title, 'Team' as subtitle,
            coalesce(last.body, '') as last_body,
            last.created_at::text as last_at,
            coalesce(u.unread, 0)::int as unread
     from profiles p
     left join lateral (
       select body, created_at from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_team'
         and m.admin_user_id = $2 and m.team_user_id = p.user_id and m.client_id is null
       order by created_at desc limit 1
     ) last on true
     left join lateral (
       select count(*) as unread from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_team'
         and m.admin_user_id = $2 and m.team_user_id = p.user_id and m.client_id is null
         and coalesce(m.sender_user_id, '') <> $2
         and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
     ) u on true
     where p.master_user_id = $1 and p.role = 'cleaner'
       and coalesce(p.cleaner_kind, 'team') = 'team'
       and coalesce(p.team_status, 'active') <> 'disabled'
     order by last.created_at desc nulls last, p.full_name`,
    [ownerId, adminUserId],
  );
}

async function loadThreads(sql: Sql, actor: Actor): Promise<ThreadSummary[]> {
  if (actor.kind === "none" || actor.kind === "client_unlinked") return [];
  const ownerId = masterUserId(actor);
  const userId = actor.userId;
  const rows: ThreadSummary[] = [];

  if (actor.kind === "cleaner") {
    rows.push(...(await loadMasterClientThreads(sql, ownerId, userId)));
    rows.push(...(await loadTeamClientOfficeThreads(sql, ownerId, userId)));
    rows.push(...(await loadMasterTeamThreads(sql, ownerId, userId)));
    rows.push(...(await loadAdminClientExisting(sql, ownerId, userId)));
    rows.push(...(await loadMasterAdminForMaster(sql, ownerId, userId)));
    rows.push(...(await loadAdminTeamExisting(sql, ownerId, userId)));
  } else if (actor.kind === "admin") {
    rows.push(...(await loadAdminClientForAdmin(sql, ownerId, userId)));
    rows.push(...(await loadMasterAdminForAdmin(sql, ownerId, userId)));
    rows.push(...(await loadAdminTeamForAdmin(sql, ownerId, userId)));
  } else if (actor.kind === "team") {
    const mt = await sql.query<ThreadSummary>(
      `select ('mt--' || $2) as thread_id,
              coalesce(p.business_name, p.full_name) as title,
              'Owner' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from profiles p
       left join lateral (
         select body, created_at from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_team'
           and m.team_user_id = $2 and m.client_id is null
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_team'
           and m.team_user_id = $2 and m.client_id is null
           and coalesce(m.sender_user_id, '') <> $2
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
       ) u on true
       where p.user_id = $1`,
      [ownerId, userId],
    );
    rows.push(...mt);

    const at = await sql.query<ThreadSummary>(
      `select ('at--' || p.user_id || '--' || $2) as thread_id,
              p.full_name as title, 'Admin' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from profiles p
       left join lateral (
         select body, created_at from messages m
         where m.cleaner_user_id = $1 and m.channel = 'admin_team'
           and m.admin_user_id = p.user_id and m.team_user_id = $2 and m.client_id is null
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.cleaner_user_id = $1 and m.channel = 'admin_team'
           and m.admin_user_id = p.user_id and m.team_user_id = $2 and m.client_id is null
           and coalesce(m.sender_user_id, '') <> $2
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
       ) u on true
       where p.master_user_id = $1 and p.role = 'cleaner'
         and coalesce(p.cleaner_kind, '') = 'admin'
         and coalesce(p.team_status, 'active') <> 'disabled'
       order by last.created_at desc nulls last, p.full_name`,
      [ownerId, userId],
    );
    rows.push(...at);

    if (canMessageClients(actor)) {
      const tc = await sql.query<ThreadSummary>(
        `select ('tc--' || $2 || '--' || c.id) as thread_id, c.name as title, 'Client' as subtitle,
                coalesce(last.body, '') as last_body,
                last.created_at::text as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         left join lateral (
           select body, created_at from messages m
           where m.cleaner_user_id = $1 and m.channel = 'team_client'
             and m.client_id = c.id and m.team_user_id = $2
           order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages m
           where m.cleaner_user_id = $1 and m.channel = 'team_client'
             and m.client_id = c.id and m.team_user_id = $2
             and coalesce(m.sender_user_id, '') <> $2
             and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
         ) u on true
         where c.cleaner_user_id = $1
           and (
             exists (select 1 from client_assignees ca where ca.client_id = c.id and ca.user_id = $2)
             or exists (
               select 1 from job_assignees ja
               join jobs j on j.id = ja.job_id
               where j.client_id = c.id and ja.user_id = $2
             )
           )
         order by last.created_at desc`,
        [ownerId, userId],
      );
      rows.push(...tc);
    }
  } else if (actor.kind === "client") {
    const mc = await sql.query<ThreadSummary>(
      `select ('mc--' || c.id) as thread_id,
              coalesce(p.business_name, p.full_name) as title,
              'Your cleaner' as subtitle,
              coalesce(last.body, '') as last_body,
              coalesce(last.created_at::text, now()::text) as last_at,
              coalesce(u.unread, 0)::int as unread
       from clients c
       join profiles p on p.user_id = c.cleaner_user_id
       left join lateral (
         select body, created_at from messages m
         where m.client_id = c.id and m.channel = 'master_client' and m.team_user_id is null
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.client_id = c.id and m.channel = 'master_client' and m.team_user_id is null
           and coalesce(m.sender_user_id, '') <> $2
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
       ) u on true
       where c.id = $1`,
      [actor.client.id, userId],
    );
    rows.push(...mc);

    const tc = await sql.query<ThreadSummary>(
      `select ('tc--' || p.user_id || '--' || c.id) as thread_id,
              p.full_name as title, 'Team cleaner' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from profiles p
       join clients c on c.id = $1
       join profiles master on master.user_id = c.cleaner_user_id
       left join lateral (
         select body, created_at from messages m
         where m.client_id = c.id and m.channel = 'team_client' and m.team_user_id = p.user_id
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.client_id = c.id and m.channel = 'team_client' and m.team_user_id = p.user_id
           and coalesce(m.sender_user_id, '') <> $2
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
       ) u on true
       where p.role = 'cleaner'
         and p.master_user_id = c.cleaner_user_id
         and coalesce(p.team_status, 'active') = 'active'
         and coalesce(p.can_message, true) = true
         and coalesce(master.team_messaging_enabled, true) = true
         and (
           exists (select 1 from client_assignees ca where ca.client_id = c.id and ca.user_id = p.user_id)
           or exists (
             select 1 from job_assignees ja
             join jobs j on j.id = ja.job_id
             where j.client_id = c.id and ja.user_id = p.user_id
           )
         )
       order by last.created_at desc nulls last, p.full_name`,
      [actor.client.id, userId],
    );
    rows.push(...tc);

    const ac = await sql.query<ThreadSummary>(
      `select ('ac--' || t.admin_id || '--' || $1) as thread_id,
              p.full_name as title, 'Admin' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from (
         select distinct coalesce(admin_user_id, team_user_id) as admin_id
         from messages
         where client_id = $1 and channel = 'admin_client'
       ) t
       join profiles p on p.user_id = t.admin_id
       join lateral (
         select body, created_at from messages m
         where m.client_id = $1 and m.channel = 'admin_client'
           and coalesce(m.admin_user_id, m.team_user_id) = t.admin_id
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.client_id = $1 and m.channel = 'admin_client'
           and coalesce(m.admin_user_id, m.team_user_id) = t.admin_id
           and coalesce(m.sender_user_id, '') <> $2
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $2)
       ) u on true
       where coalesce(p.cleaner_kind, '') = 'admin'
       order by last.created_at desc`,
      [actor.client.id, userId],
    );
    rows.push(...ac);
  }

  return sortThreads(rows);
}

async function unreadCount(sql: Sql, actor: Actor) {
  const threads = await loadThreads(sql, actor);
  return threads.reduce((n, t) => n + Number(t.unread || 0), 0);
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    return loadThreads(sql, actor);
  });

export { loadThreads, unreadCount };

export const listMessageRecipients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const people: MessageRecipient[] = [];

    if (actor.kind === "cleaner") {
      const ownerId = masterUserId(actor);
      const clients = await sql<{ id: string; name: string; subtitle: string | null }>`
        select id, name, coalesce(address, email, phone) as subtitle
        from clients where cleaner_user_id = ${ownerId} order by name
      `;
      for (const c of clients) {
        people.push({
          id: encodeThreadId({ channel: "master_client", clientId: c.id }),
          name: c.name,
          subtitle: "Client",
        });
      }
      const team = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${ownerId} and role = 'cleaner'
          and coalesce(team_status, 'active') = 'active'
          and coalesce(cleaner_kind, 'team') = 'team'
        order by full_name
      `;
      for (const t of team) {
        people.push({
          id: encodeThreadId({ channel: "master_team", teamUserId: t.user_id }),
          name: t.full_name,
          subtitle: "Team",
        });
      }
      const admins = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${ownerId} and role = 'cleaner'
          and coalesce(team_status, 'active') = 'active'
          and coalesce(cleaner_kind, '') = 'admin'
        order by full_name
      `;
      for (const a of admins) {
        people.push({
          id: encodeThreadId({ channel: "master_admin", adminUserId: a.user_id }),
          name: a.full_name,
          subtitle: "Admin",
        });
      }
      const labeled = await sql.query<{
        client_id: string;
        team_user_id: string;
        client_name: string;
        team_name: string;
      }>(
        `select distinct m.client_id, m.team_user_id, c.name as client_name, p.full_name as team_name
         from messages m
         join clients c on c.id = m.client_id
         join profiles p on p.user_id = m.team_user_id
         where m.cleaner_user_id = $1 and m.channel = 'team_client'
           and m.client_id is not null and m.team_user_id is not null
           and coalesce(p.cleaner_kind, 'team') = 'team'
         order by c.name, p.full_name`,
        [ownerId],
      );
      for (const t of labeled) {
        people.push({
          id: encodeThreadId({ channel: "team_client", clientId: t.client_id, teamUserId: t.team_user_id }),
          name: `${t.client_name} · ${t.team_name}`,
          subtitle: "Team ↔ client",
        });
      }
      const adminClient = await sql.query<{
        client_id: string;
        admin_id: string;
        client_name: string;
        admin_name: string;
      }>(
        `select distinct m.client_id, coalesce(m.admin_user_id, m.team_user_id) as admin_id,
                c.name as client_name, p.full_name as admin_name
         from messages m
         join clients c on c.id = m.client_id
         join profiles p on p.user_id = coalesce(m.admin_user_id, m.team_user_id)
         where m.cleaner_user_id = $1 and m.channel = 'admin_client'
           and m.client_id is not null
           and coalesce(p.cleaner_kind, '') = 'admin'
         order by c.name, p.full_name`,
        [ownerId],
      );
      for (const t of adminClient) {
        people.push({
          id: encodeThreadId({ channel: "admin_client", clientId: t.client_id, adminUserId: t.admin_id }),
          name: `${t.client_name} · ${t.admin_name}`,
          subtitle: "Admin ↔ client",
        });
      }
      return people;
    }

    if (actor.kind === "admin") {
      const ownerId = masterUserId(actor);
      people.push({
        id: encodeThreadId({ channel: "master_admin", adminUserId: actor.userId }),
        name: "Account owner",
        subtitle: "Internal",
      });
      const clients = await sql<{ id: string; name: string; subtitle: string | null }>`
        select id, name, coalesce(address, email, phone) as subtitle
        from clients where cleaner_user_id = ${ownerId} order by name
      `;
      for (const c of clients) {
        people.push({
          id: encodeThreadId({ channel: "admin_client", adminUserId: actor.userId, clientId: c.id }),
          name: c.name,
          subtitle: "Client",
        });
      }
      const team = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${ownerId} and role = 'cleaner'
          and coalesce(team_status, 'active') = 'active'
          and coalesce(cleaner_kind, 'team') = 'team'
        order by full_name
      `;
      for (const t of team) {
        people.push({
          id: encodeThreadId({ channel: "admin_team", adminUserId: actor.userId, teamUserId: t.user_id }),
          name: t.full_name,
          subtitle: "Team",
        });
      }
      return people;
    }

    if (actor.kind === "team") {
      people.push({
        id: encodeThreadId({ channel: "master_team", teamUserId: actor.userId }),
        name: "Account owner",
        subtitle: "Internal",
      });
      const admins = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${actor.masterUserId} and role = 'cleaner'
          and coalesce(team_status, 'active') = 'active'
          and coalesce(cleaner_kind, '') = 'admin'
        order by full_name
      `;
      for (const a of admins) {
        people.push({
          id: encodeThreadId({ channel: "admin_team", adminUserId: a.user_id, teamUserId: actor.userId }),
          name: a.full_name,
          subtitle: "Admin",
        });
      }
      if (!canMessageClients(actor)) return people;
      const clients = await sql.query<{ id: string; name: string; subtitle: string | null }>(
        `select c.id, c.name, coalesce(c.address, c.email, c.phone) as subtitle
         from clients c
         where c.cleaner_user_id = $1
           and (
             exists (select 1 from client_assignees ca where ca.client_id = c.id and ca.user_id = $2)
             or exists (
               select 1 from job_assignees ja
               join jobs j on j.id = ja.job_id
               where j.client_id = c.id and ja.user_id = $2
             )
           )
         order by c.name`,
        [actor.masterUserId, actor.userId],
      );
      for (const c of clients) {
        people.push({
          id: encodeThreadId({ channel: "team_client", clientId: c.id, teamUserId: actor.userId }),
          name: c.name,
          subtitle: c.subtitle,
        });
      }
      return people;
    }

    if (actor.kind === "client") {
      people.push({
        id: encodeThreadId({ channel: "master_client", clientId: actor.client.id }),
        name: actor.cleanerName,
        subtitle: "Your cleaner",
      });
      const team = await sql<{ user_id: string; full_name: string }>`
        select p.user_id, p.full_name
        from profiles p
        join profiles master on master.user_id = ${actor.client.cleaner_user_id}
        where p.role = 'cleaner'
          and p.master_user_id = ${actor.client.cleaner_user_id}
          and coalesce(p.team_status, 'active') = 'active'
          and coalesce(p.can_message, true) = true
          and coalesce(master.team_messaging_enabled, true) = true
          and (
            exists (select 1 from client_assignees ca where ca.client_id = ${actor.client.id} and ca.user_id = p.user_id)
            or exists (
              select 1 from job_assignees ja
              join jobs j on j.id = ja.job_id
              where j.client_id = ${actor.client.id} and ja.user_id = p.user_id
            )
          )
        order by p.full_name
      `;
      for (const t of team) {
        people.push({
          id: encodeThreadId({ channel: "team_client", clientId: actor.client.id, teamUserId: t.user_id }),
          name: t.full_name,
          subtitle: "Team cleaner",
        });
      }
      const admins = await sql<{ user_id: string; full_name: string }>`
        select distinct p.user_id, p.full_name
        from messages m
        join profiles p on p.user_id = coalesce(m.admin_user_id, m.team_user_id)
        where m.client_id = ${actor.client.id}
          and m.channel = 'admin_client'
          and coalesce(p.cleaner_kind, '') = 'admin'
        order by p.full_name
      `;
      for (const a of admins) {
        people.push({
          id: encodeThreadId({ channel: "admin_client", adminUserId: a.user_id, clientId: actor.client.id }),
          name: a.full_name,
          subtitle: "Admin",
        });
      }
      return people;
    }
    return people;
  });

export const unreadMessageCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    return unreadCount(sql, actor);
  });

export const getNavBadges = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    const unreadMessages = await unreadCount(sql, actor);
    const notes = await sql<{ n: number }>`
      select count(*)::int as n from notifications
      where user_id = ${context.userId} and status = 'unread'
    `;
    let pendingCleanRequests = 0;
    if (isOffice(actor)) {
      const cleans = await sql<{ n: number }>`
        select count(*)::int as n from clean_requests
        where cleaner_user_id = ${masterUserId(actor)} and status = 'pending'
      `;
      pendingCleanRequests = Number(cleans[0]?.n || 0);
    }
    return { unreadMessages, unreadNotifications: Number(notes[0]?.n || 0), pendingCleanRequests };
  });

async function loadThreadMessages(sql: Sql, ownerId: string, thread: ThreadRef) {
  const store = threadStorage(thread);
  if (thread.channel === "master_client") {
    return sql.query<MessageRow>(
      `select ${MSG_SELECT} from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_client'
         and m.client_id = $2 and m.team_user_id is null
       order by m.created_at asc`,
      [ownerId, thread.clientId],
    );
  }
  if (thread.channel === "team_client") {
    return sql.query<MessageRow>(
      `select ${MSG_SELECT} from messages m
       where m.cleaner_user_id = $1 and m.channel = 'team_client'
         and m.client_id = $2 and m.team_user_id = $3
       order by m.created_at asc`,
      [ownerId, thread.clientId, thread.teamUserId],
    );
  }
  if (thread.channel === "master_team") {
    return sql.query<MessageRow>(
      `select ${MSG_SELECT} from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_team'
         and m.team_user_id = $2 and m.client_id is null
       order by m.created_at asc`,
      [ownerId, thread.teamUserId],
    );
  }
  if (thread.channel === "admin_client") {
    return sql.query<MessageRow>(
      `select ${MSG_SELECT} from messages m
       where m.cleaner_user_id = $1 and m.channel = 'admin_client'
         and m.client_id = $2 and coalesce(m.admin_user_id, m.team_user_id) = $3
       order by m.created_at asc`,
      [ownerId, thread.clientId, store.adminUserId],
    );
  }
  if (thread.channel === "master_admin") {
    return sql.query<MessageRow>(
      `select ${MSG_SELECT} from messages m
       where m.cleaner_user_id = $1 and m.channel = 'master_admin'
         and coalesce(m.admin_user_id, m.team_user_id) = $2 and m.client_id is null
       order by m.created_at asc`,
      [ownerId, store.adminUserId],
    );
  }
  return sql.query<MessageRow>(
    `select ${MSG_SELECT} from messages m
     where m.cleaner_user_id = $1 and m.channel = 'admin_team'
       and m.team_user_id = $2 and m.admin_user_id = $3 and m.client_id is null
     order by m.created_at asc`,
    [ownerId, store.teamUserId, store.adminUserId],
  );
}

export const getThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((threadId: string) => threadId)
  .handler(async ({ context, data: threadId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const thread = parseThreadId(threadId);
    const access = await assertThreadAccess(sql, actor, thread);
    await markThreadRead(sql, context.userId, access.ownerId, thread);

    let title = "Messages";
    let subtitle: string | null = null;
    if (thread.channel === "master_client" && thread.clientId) {
      if (actor.kind === "client") {
        title = actor.cleanerName;
        subtitle = "Your cleaner";
      } else {
        const owned = await sql<{ name: string }>`select name from clients where id = ${thread.clientId} limit 1`;
        title = owned[0]?.name || "Client";
      }
    } else if (thread.channel === "team_client" && thread.clientId) {
      const owned = await sql<{ name: string }>`select name from clients where id = ${thread.clientId} limit 1`;
      title = owned[0]?.name || "Client";
      subtitle = access.teamName ? `with ${access.teamName}` : "Team";
      if (actor.kind === "client") {
        title = access.teamName || "Team cleaner";
        subtitle = "Team cleaner";
      } else if (actor.kind === "team") {
        subtitle = "Client";
      }
    } else if (thread.channel === "master_team") {
      if (actor.kind === "team") {
        const master = await sql<{ full_name: string; business_name: string | null }>`
          select full_name, business_name from profiles where user_id = ${access.ownerId} limit 1
        `;
        title = master[0]?.business_name || master[0]?.full_name || "Owner";
        subtitle = "Internal";
      } else {
        title = access.teamName || "Team";
        subtitle = "Team";
      }
    } else if (thread.channel === "admin_client" && thread.clientId) {
      const owned = await sql<{ name: string }>`select name from clients where id = ${thread.clientId} limit 1`;
      title = owned[0]?.name || "Client";
      subtitle = access.adminName ? access.adminName : "Admin";
      if (actor.kind === "client") {
        title = access.adminName || "Admin";
        subtitle = "Admin";
      } else if (actor.kind === "admin") {
        subtitle = "Client";
      } else {
        subtitle = access.adminName || "Admin";
      }
    } else if (thread.channel === "master_admin") {
      if (actor.kind === "admin") {
        const master = await sql<{ full_name: string; business_name: string | null }>`
          select full_name, business_name from profiles where user_id = ${access.ownerId} limit 1
        `;
        title = master[0]?.business_name || master[0]?.full_name || "Owner";
        subtitle = "Internal";
      } else {
        title = access.adminName || "Admin";
        subtitle = "Admin";
      }
    } else if (thread.channel === "admin_team") {
      if (actor.kind === "team") {
        title = access.adminName || "Admin";
        subtitle = "Admin";
      } else if (actor.kind === "admin") {
        title = access.teamName || "Team";
        subtitle = "Team";
      } else {
        title = access.teamName || "Team";
        subtitle = access.adminName || "Admin";
      }
    }

    const messages = await loadThreadMessages(sql, access.ownerId, thread);
    return { title, subtitle, messages, threadId, clientId: thread.clientId };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string; clientId?: string; body: string }) => {
    const body = input.body.trim();
    if (!body) throw new Error("Write a message first.");
    const threadId = input.threadId || input.clientId;
    if (!threadId) throw new Error("Choose who to message.");
    try {
      parseThreadId(threadId);
    } catch {
      throw new Error("Choose who to message.");
    }
    return { threadId, body };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const thread = parseThreadId(data.threadId);
    const access = await assertThreadAccess(sql, actor, thread);
    const store = threadStorage(thread);
    const senderName =
      actor.kind === "client"
        ? actor.client.name
        : actor.kind === "cleaner" || actor.kind === "admin" || actor.kind === "team"
          ? actor.profile.full_name
          : "Someone";
    const senderRole = actor.kind === "client" ? "client" : "cleaner";
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body,
        channel, team_user_id, admin_user_id, sender_user_id, sender_name
      ) values (
        ${nid("msg")}, ${access.ownerId}, ${store.clientId}, ${senderRole}, ${data.body},
        ${thread.channel}, ${store.teamUserId}, ${store.adminUserId}, ${context.userId}, ${senderName}
      )
    `;
    return { ok: true };
  });
