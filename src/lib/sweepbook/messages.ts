import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { canMessageClients, getActor } from "./access";
import { teamCanAccessClient } from "./assignees";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import type { MessageRecipient, MessageRow, ThreadSummary } from "./types";

const TEAM_CLIENT_ACCESS = `
  (
    exists (select 1 from client_assignees ca where ca.client_id = c.id and ca.user_id = $2)
    or exists (
      select 1 from job_assignees ja
      join jobs j on j.id = ja.job_id
      where j.client_id = c.id and ja.user_id = $2
    )
  )
`;

const TEAM_MSG_ACCESS = `
  (
    exists (select 1 from client_assignees ca where ca.client_id = m.client_id and ca.user_id = $2)
    or exists (
      select 1 from job_assignees ja
      join jobs j on j.id = ja.job_id
      where j.client_id = m.client_id and ja.user_id = $2
    )
  )
`;

export const listThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      return sql.query<ThreadSummary>(
        `select c.id as client_id, c.name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, c.created_at::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         left join lateral (
           select body, created_at from messages
           where client_id = c.id and cleaner_user_id = $1
           order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages
           where client_id = c.id and cleaner_user_id = $1
             and sender_role = 'client' and read_at is null
         ) u on true
         where c.cleaner_user_id = $1
           and last.body is not null
         order by last.created_at desc`,
        [context.userId],
      );
    }
    if (actor.kind === "team") {
      if (!canMessageClients(actor)) return [] as ThreadSummary[];
      return sql.query<ThreadSummary>(
        `select c.id as client_id, c.name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, c.created_at::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         left join lateral (
           select body, created_at from messages
           where client_id = c.id and cleaner_user_id = $1
           order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages
           where client_id = c.id and cleaner_user_id = $1
             and sender_role = 'client' and read_at is null
         ) u on true
         where c.cleaner_user_id = $1
           and last.body is not null
           and ${TEAM_CLIENT_ACCESS}
         order by last.created_at desc`,
        [actor.masterUserId, context.userId],
      );
    }
    if (actor.kind === "client") {
      return sql.query<ThreadSummary>(
        `select c.id as client_id, p.business_name as client_name,
                coalesce(last.body, '') as last_body,
                coalesce(last.created_at::text, now()::text) as last_at,
                coalesce(u.unread, 0)::int as unread
         from clients c
         join profiles p on p.user_id = c.cleaner_user_id
         left join lateral (
           select body, created_at from messages
           where client_id = c.id order by created_at desc limit 1
         ) last on true
         left join lateral (
           select count(*) as unread from messages
           where client_id = c.id and sender_role = 'cleaner' and read_at is null
         ) u on true
         where c.id = $1`,
        [actor.client.id],
      );
    }
    return [] as ThreadSummary[];
  });

export const listMessageRecipients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      return sql.query<MessageRecipient>(
        `select id, name, coalesce(address, email, phone) as subtitle
         from clients where cleaner_user_id = $1 order by name`,
        [context.userId],
      );
    }
    if (actor.kind === "team") {
      if (!canMessageClients(actor)) return [] as MessageRecipient[];
      return sql.query<MessageRecipient>(
        `select c.id, c.name, coalesce(c.address, c.email, c.phone) as subtitle
         from clients c
         where c.cleaner_user_id = $1 and ${TEAM_CLIENT_ACCESS}
         order by c.name`,
        [actor.masterUserId, context.userId],
      );
    }
    if (actor.kind === "client") {
      return [
        {
          id: actor.client.id,
          name: actor.cleanerName,
          subtitle: "Your cleaner",
        },
      ] satisfies MessageRecipient[];
    }
    return [] as MessageRecipient[];
  });

export const unreadMessageCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      const rows = await sql<{ n: number }>`
        select count(*)::int as n from messages
        where cleaner_user_id = ${context.userId} and sender_role = 'client' and read_at is null
      `;
      return Number(rows[0]?.n || 0);
    }
    if (actor.kind === "team" && canMessageClients(actor)) {
      const rows = await sql.query<{ n: number }>(
        `select count(*)::int as n from messages m
         where m.cleaner_user_id = $1 and m.sender_role = 'client' and m.read_at is null
           and ${TEAM_MSG_ACCESS}`,
        [actor.masterUserId, context.userId],
      );
      return Number(rows[0]?.n || 0);
    }
    if (actor.kind === "client") {
      const rows = await sql<{ n: number }>`
        select count(*)::int as n from messages
        where client_id = ${actor.client.id} and sender_role = 'cleaner' and read_at is null
      `;
      return Number(rows[0]?.n || 0);
    }
    return 0;
  });

export const getNavBadges = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    let unreadMessages = 0;
    if (actor.kind === "cleaner") {
      const rows = await sql<{ n: number }>`
        select count(*)::int as n from messages
        where cleaner_user_id = ${context.userId} and sender_role = 'client' and read_at is null
      `;
      unreadMessages = Number(rows[0]?.n || 0);
    } else if (actor.kind === "team" && canMessageClients(actor)) {
      const rows = await sql.query<{ n: number }>(
        `select count(*)::int as n from messages m
         where m.cleaner_user_id = $1 and m.sender_role = 'client' and m.read_at is null
           and ${TEAM_MSG_ACCESS}`,
        [actor.masterUserId, context.userId],
      );
      unreadMessages = Number(rows[0]?.n || 0);
    } else if (actor.kind === "client") {
      const rows = await sql<{ n: number }>`
        select count(*)::int as n from messages
        where client_id = ${actor.client.id} and sender_role = 'cleaner' and read_at is null
      `;
      unreadMessages = Number(rows[0]?.n || 0);
    }
    const notes = await sql<{ n: number }>`
      select count(*)::int as n from notifications
      where user_id = ${context.userId} and status = 'unread'
    `;
    return { unreadMessages, unreadNotifications: Number(notes[0]?.n || 0) };
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ context, data: clientId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      const owned = await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${context.userId} limit 1`;
      if (!owned[0]) throw new Error("Thread not found.");
      await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and cleaner_user_id = ${context.userId}
          and sender_role = 'client' and read_at is null
      `;
      const messages = await sql<MessageRow>`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId} and cleaner_user_id = ${context.userId}
        order by created_at asc
      `;
      return { title: (owned[0] as { name: string }).name, messages, clientId };
    }
    if (actor.kind === "team") {
      if (!canMessageClients(actor)) throw new Error("Messaging is turned off for your login.");
      const allowed = await teamCanAccessClient(sql, context.userId, clientId);
      if (!allowed) throw new Error("Thread not found.");
      const owned = await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${actor.masterUserId} limit 1`;
      if (!owned[0]) throw new Error("Thread not found.");
      await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and cleaner_user_id = ${actor.masterUserId}
          and sender_role = 'client' and read_at is null
      `;
      const messages = await sql<MessageRow>`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId} and cleaner_user_id = ${actor.masterUserId}
        order by created_at asc
      `;
      return { title: (owned[0] as { name: string }).name, messages, clientId };
    }
    if (actor.kind === "client") {
      if (actor.client.id !== clientId) throw new Error("Thread not found.");
      await sql`
        update messages set read_at = now()
        where client_id = ${clientId} and sender_role = 'cleaner' and read_at is null
      `;
      const messages = await sql<MessageRow>`
        select id, cleaner_user_id, client_id, sender_role, body,
               created_at::text as created_at, read_at::text as read_at
        from messages
        where client_id = ${clientId}
        order by created_at asc
      `;
      return { title: actor.cleanerName, messages, clientId };
    }
    throw new Error("Thread not found.");
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; body: string }) => {
    const body = input.body.trim();
    if (!body) throw new Error("Write a message first.");
    return { clientId: input.clientId, body };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner") {
      const owned = await sql`select id from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1`;
      if (!owned[0]) throw new Error("Client not found.");
      await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${context.userId}, ${data.clientId}, ${"cleaner"}, ${data.body})
      `;
      return { ok: true };
    }
    if (actor.kind === "team") {
      if (!canMessageClients(actor)) throw new Error("Messaging is turned off for your login.");
      const allowed = await teamCanAccessClient(sql, context.userId, data.clientId);
      if (!allowed) throw new Error("Thread not found.");
      await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${actor.masterUserId}, ${data.clientId}, ${"cleaner"}, ${data.body})
      `;
      return { ok: true };
    }
    if (actor.kind === "client") {
      if (actor.client.id !== data.clientId) throw new Error("Thread not found.");
      await sql`
        insert into messages (id, cleaner_user_id, client_id, sender_role, body)
        values (${nid("msg")}, ${actor.client.cleaner_user_id}, ${data.clientId}, ${"client"}, ${data.body})
      `;
      return { ok: true };
    }
    throw new Error("Cannot send.");
  });
