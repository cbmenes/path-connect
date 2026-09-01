import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { canMessageClients, getActor, masterUserId } from "./access";
import { teamCanAccessClient } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import { encodeThreadId, parseThreadId, type ThreadRef } from "./threads";
import type { Actor, MessageRecipient, MessageRow, ThreadSummary } from "./types";

async function assertThreadAccess(sql: Sql, actor: Actor, ref: ThreadRef) {
  if (actor.kind === "none" || actor.kind === "client_unlinked") {
    throw new Error("Thread not found.");
  }
  const ownerId = masterUserId(actor);

  if (ref.channel === "master_client") {
    if (!ref.clientId) throw new Error("Thread not found.");
    if (actor.kind === "team") throw new Error("Thread not found.");
    if (actor.kind === "client") {
      if (actor.client.id !== ref.clientId) throw new Error("Thread not found.");
      return { ownerId, ref };
    }
    const owned = await sql`select id from clients where id = ${ref.clientId} and cleaner_user_id = ${ownerId} limit 1`;
    if (!owned[0]) throw new Error("Thread not found.");
    return { ownerId, ref };
  }

  if (ref.channel === "team_client") {
    if (!ref.clientId || !ref.teamUserId) throw new Error("Thread not found.");
    const team = await sql<{ user_id: string; full_name: string; can_message: boolean }>`
      select user_id, full_name, can_message from profiles
      where user_id = ${ref.teamUserId} and master_user_id = ${ownerId} and role = 'cleaner'
      limit 1
    `;
    if (!team[0]) throw new Error("Thread not found.");
    const master = await sql<{ team_messaging_enabled: boolean }>`
      select team_messaging_enabled from profiles where user_id = ${ownerId} limit 1
    `;
    const messagingOn = Boolean(master[0]?.team_messaging_enabled) && Boolean(team[0].can_message);
    if (actor.kind === "client") {
      if (actor.client.id !== ref.clientId || !messagingOn) throw new Error("Thread not found.");
      return { ownerId, ref, teamName: team[0].full_name };
    }
    if (actor.kind === "team") {
      if (actor.userId !== ref.teamUserId || !canMessageClients(actor)) throw new Error("Thread not found.");
      const allowed = await teamCanAccessClient(sql, actor.userId, ref.clientId);
      if (!allowed) throw new Error("Thread not found.");
      return { ownerId, ref, teamName: team[0].full_name };
    }
    const owned = await sql`select id from clients where id = ${ref.clientId} and cleaner_user_id = ${ownerId} limit 1`;
    if (!owned[0]) throw new Error("Thread not found.");
    return { ownerId, ref, teamName: team[0].full_name };
  }

  if (!ref.teamUserId) throw new Error("Thread not found.");
  if (actor.kind === "client") throw new Error("Thread not found.");
  const team = await sql<{ user_id: string; full_name: string }>`
    select user_id, full_name from profiles
    where user_id = ${ref.teamUserId} and master_user_id = ${ownerId} and role = 'cleaner'
    limit 1
  `;
  if (!team[0]) throw new Error("Thread not found.");
  if (actor.kind === "team" && actor.userId !== ref.teamUserId) throw new Error("Thread not found.");
  return { ownerId, ref, teamName: team[0].full_name };
}

async function markThreadRead(sql: Sql, userId: string, ownerId: string, ref: ThreadRef) {
  if (ref.channel === "master_client") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'master_client'
        and m.client_id = ${ref.clientId}
        and m.team_user_id is null
      on conflict do nothing
    `;
    return;
  }
  if (ref.channel === "team_client") {
    await sql`
      insert into message_reads (message_id, user_id)
      select m.id, ${userId} from messages m
      where m.cleaner_user_id = ${ownerId}
        and m.channel = 'team_client'
        and m.client_id = ${ref.clientId}
        and m.team_user_id = ${ref.teamUserId}
      on conflict do nothing
    `;
    return;
  }
  await sql`
    insert into message_reads (message_id, user_id)
    select m.id, ${userId} from messages m
    where m.cleaner_user_id = ${ownerId}
      and m.channel = 'master_team'
      and m.team_user_id = ${ref.teamUserId}
      and m.client_id is null
    on conflict do nothing
  `;
}

const MSG_SELECT = `
  id, cleaner_user_id, client_id, sender_role, body,
  created_at::text as created_at, read_at::text as read_at,
  channel, team_user_id, sender_user_id, sender_name
`;

async function loadThreads(sql: Sql, actor: Actor): Promise<ThreadSummary[]> {
  if (actor.kind === "none" || actor.kind === "client_unlinked") return [];
  const ownerId = masterUserId(actor);
  const userId = actor.userId;
  const rows: ThreadSummary[] = [];

  if (actor.kind === "cleaner") {
    const mc = await sql.query<ThreadSummary>(
      `select ('mc--' || c.id) as thread_id, c.name as title, null as subtitle,
              coalesce(last.body, '') as last_body,
              coalesce(last.created_at::text, c.created_at::text) as last_at,
              coalesce(u.unread, 0)::int as unread
       from clients c
       join lateral (
         select body, created_at from messages m
         where m.client_id = c.id and m.cleaner_user_id = $1
           and m.channel = 'master_client' and m.team_user_id is null
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.client_id = c.id and m.cleaner_user_id = $1
           and m.channel = 'master_client' and m.team_user_id is null
           and coalesce(m.sender_user_id, '') <> $1
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $1)
       ) u on true
       where c.cleaner_user_id = $1
       order by last.created_at desc`,
      [ownerId],
    );
    rows.push(...mc);

    const tc = await sql.query<ThreadSummary>(
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
           and coalesce(m.sender_user_id, '') <> $1
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $1)
       ) u on true
       order by last.created_at desc`,
      [ownerId],
    );
    rows.push(...tc);

    const mt = await sql.query<ThreadSummary>(
      `select ('mt--' || p.user_id) as thread_id, p.full_name as title, 'Team' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from profiles p
       join lateral (
         select body, created_at from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_team'
           and m.team_user_id = p.user_id and m.client_id is null
         order by created_at desc limit 1
       ) last on true
       left join lateral (
         select count(*) as unread from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_team'
           and m.team_user_id = p.user_id and m.client_id is null
           and coalesce(m.sender_user_id, '') <> $1
           and not exists (select 1 from message_reads r where r.message_id = m.id and r.user_id = $1)
       ) u on true
       where p.master_user_id = $1 and p.role = 'cleaner'
       order by last.created_at desc`,
      [ownerId],
    );
    rows.push(...mt);
  } else if (actor.kind === "team") {
    const mt = await sql.query<ThreadSummary>(
      `select ('mt--' || $2) as thread_id,
              coalesce(p.business_name, p.full_name) as title,
              'Owner' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from profiles p
       join lateral (
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

    if (canMessageClients(actor)) {
      const tc = await sql.query<ThreadSummary>(
        `select ('tc--' || $2 || '--' || c.id) as thread_id, c.name as title, 'Client' as subtitle,
                coalesce(last.body, '') as last_body,
                last.created_at::text as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         join lateral (
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
    rows.push(...mc.filter((t) => t.last_body));

    const tc = await sql.query<ThreadSummary>(
      `select ('tc--' || p.user_id || '--' || c.id) as thread_id,
              p.full_name as title, 'Team cleaner' as subtitle,
              coalesce(last.body, '') as last_body,
              last.created_at::text as last_at,
              coalesce(u.unread, 0)::int as unread
       from client_assignees ca
       join profiles p on p.user_id = ca.user_id
       join clients c on c.id = ca.client_id
       join profiles master on master.user_id = c.cleaner_user_id
       join lateral (
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
       where ca.client_id = $1
         and coalesce(p.can_message, true) = true
         and coalesce(master.team_messaging_enabled, true) = true
         and coalesce(p.team_status, 'active') = 'active'
       order by last.created_at desc`,
      [actor.client.id, userId],
    );
    rows.push(...tc);
  }

  rows.sort((a, b) => (a.last_at < b.last_at ? 1 : a.last_at > b.last_at ? -1 : 0));
  return rows.map((r) => ({
    ...r,
    unread: Number(r.unread || 0),
    subtitle: r.subtitle ?? null,
  }));
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
      const clients = await sql<{ id: string; name: string; subtitle: string | null }>`
        select id, name, coalesce(address, email, phone) as subtitle
        from clients where cleaner_user_id = ${context.userId} order by name
      `;
      for (const c of clients) {
        people.push({
          id: encodeThreadId({ channel: "master_client", clientId: c.id, teamUserId: null }),
          name: c.name,
          subtitle: c.subtitle,
        });
      }
      const team = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${context.userId} and role = 'cleaner'
          and coalesce(team_status, 'active') = 'active'
        order by full_name
      `;
      for (const t of team) {
        people.push({
          id: encodeThreadId({ channel: "master_team", clientId: null, teamUserId: t.user_id }),
          name: t.full_name,
          subtitle: "Team",
        });
      }
      return people;
    }
    if (actor.kind === "team") {
      people.push({
        id: encodeThreadId({ channel: "master_team", clientId: null, teamUserId: actor.userId }),
        name: "Account owner",
        subtitle: "Internal",
      });
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
        id: encodeThreadId({ channel: "master_client", clientId: actor.client.id, teamUserId: null }),
        name: actor.cleanerName,
        subtitle: "Your cleaner",
      });
      const team = await sql<{ user_id: string; full_name: string }>`
        select p.user_id, p.full_name
        from client_assignees ca
        join profiles p on p.user_id = ca.user_id
        join profiles master on master.user_id = ${actor.client.cleaner_user_id}
        where ca.client_id = ${actor.client.id}
          and coalesce(p.can_message, true) = true
          and coalesce(master.team_messaging_enabled, true) = true
          and coalesce(p.team_status, 'active') = 'active'
        order by p.full_name
      `;
      for (const t of team) {
        people.push({
          id: encodeThreadId({ channel: "team_client", clientId: actor.client.id, teamUserId: t.user_id }),
          name: t.full_name,
          subtitle: "Team cleaner",
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
    return { unreadMessages, unreadNotifications: Number(notes[0]?.n || 0) };
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((threadId: string) => threadId)
  .handler(async ({ context, data: threadId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const ref = parseThreadId(threadId);
    const access = await assertThreadAccess(sql, actor, ref);
    await markThreadRead(sql, context.userId, access.ownerId, ref);

    let title = "Messages";
    let subtitle: string | null = null;
    if (ref.channel === "master_client" && ref.clientId) {
      if (actor.kind === "client") {
        title = actor.cleanerName;
        subtitle = "Your cleaner";
      } else {
        const owned = await sql<{ name: string }>`select name from clients where id = ${ref.clientId} limit 1`;
        title = owned[0]?.name || "Client";
      }
    } else if (ref.channel === "team_client" && ref.clientId) {
      const owned = await sql<{ name: string }>`select name from clients where id = ${ref.clientId} limit 1`;
      title = owned[0]?.name || "Client";
      subtitle = access.teamName ? `with ${access.teamName}` : "Team";
      if (actor.kind === "client") {
        title = access.teamName || "Team cleaner";
        subtitle = "Team cleaner";
      } else if (actor.kind === "team") {
        subtitle = "Client";
      }
    } else if (ref.channel === "master_team") {
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
    }

    let messages: MessageRow[] = [];
    if (ref.channel === "master_client") {
      messages = await sql.query<MessageRow>(
        `select ${MSG_SELECT} from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_client'
           and m.client_id = $2 and m.team_user_id is null
         order by m.created_at asc`,
        [access.ownerId, ref.clientId],
      );
    } else if (ref.channel === "team_client") {
      messages = await sql.query<MessageRow>(
        `select ${MSG_SELECT} from messages m
         where m.cleaner_user_id = $1 and m.channel = 'team_client'
           and m.client_id = $2 and m.team_user_id = $3
         order by m.created_at asc`,
        [access.ownerId, ref.clientId, ref.teamUserId],
      );
    } else {
      messages = await sql.query<MessageRow>(
        `select ${MSG_SELECT} from messages m
         where m.cleaner_user_id = $1 and m.channel = 'master_team'
           and m.team_user_id = $2 and m.client_id is null
         order by m.created_at asc`,
        [access.ownerId, ref.teamUserId],
      );
    }

    return { title, subtitle, messages, threadId, clientId: ref.clientId };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string; clientId?: string; body: string }) => {
    const body = input.body.trim();
    if (!body) throw new Error("Write a message first.");
    const threadId = input.threadId || input.clientId;
    if (!threadId) throw new Error("Choose a conversation.");
    return { threadId, body };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const ref = parseThreadId(data.threadId);
    const access = await assertThreadAccess(sql, actor, ref);
    const senderName =
      actor.kind === "client"
        ? actor.client.name
        : actor.kind === "cleaner" || actor.kind === "team"
          ? actor.profile.full_name
          : "Someone";
    const senderRole = actor.kind === "client" ? "client" : "cleaner";
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body,
        channel, team_user_id, sender_user_id, sender_name
      ) values (
        ${nid("msg")}, ${access.ownerId}, ${ref.clientId}, ${senderRole}, ${data.body},
        ${ref.channel}, ${ref.teamUserId}, ${context.userId}, ${senderName}
      )
    `;
    return { ok: true };
  });
