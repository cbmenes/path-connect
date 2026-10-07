import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertActivePlan, getActor, masterUserId } from "./access";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";
import type { NotificationKind, NotificationRow } from "./types";

export async function insertNotification(
  sql: Sql,
  input: {
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string | null;
    jobId?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    requestId?: string | null;
    requestedStartAt?: string | null;
  },
) {
  await sql`
    insert into notifications (
      id, user_id, kind, title, body, job_id, client_id, client_name, request_id, requested_start_at, status
    ) values (
      ${nid("ntf")}, ${input.userId}, ${input.kind}, ${input.title}, ${input.body ?? null},
      ${input.jobId ?? null}, ${input.clientId ?? null}, ${input.clientName ?? null},
      ${input.requestId ?? null}, ${input.requestedStartAt ?? null}, ${"unread"}
    )
  `;
  if (
    input.kind === "cancel" ||
    input.kind === "reschedule" ||
    input.kind === "tip" ||
    input.kind === "clean_request" ||
    input.kind === "time_off"
  ) {
    const master = await sql<{ user_id: string }>`
      select user_id from profiles
      where user_id = ${input.userId} and role = 'cleaner'
        and coalesce(cleaner_kind, 'master') = 'master'
      limit 1
    `;
    if (master[0]) {
      const admins = await sql<{ user_id: string }>`
        select user_id from profiles
        where master_user_id = ${input.userId}
          and cleaner_kind = 'admin'
          and coalesce(team_status, 'active') = 'active'
      `;
      for (const admin of admins) {
        await sql`
          insert into notifications (
            id, user_id, kind, title, body, job_id, client_id, client_name, request_id, requested_start_at, status
          ) values (
            ${nid("ntf")}, ${admin.user_id}, ${input.kind}, ${input.title}, ${input.body ?? null},
            ${input.jobId ?? null}, ${input.clientId ?? null}, ${input.clientName ?? null},
            ${input.requestId ?? null}, ${input.requestedStartAt ?? null}, ${"unread"}
          )
        `;
      }
    }
  }
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    await getActor(sql, context.userId);
    return sql<NotificationRow>`
      select id, user_id, kind, title, body, job_id, client_id, client_name,
             request_id, requested_start_at::text as requested_start_at, status,
             created_at::text as created_at, handled_at::text as handled_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { id?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update notifications set status = 'read'
        where id = ${data.id} and user_id = ${context.userId} and status = 'unread'
      `;
    } else {
      await sql`
        update notifications set status = 'read'
        where user_id = ${context.userId} and status = 'unread'
      `;
    }
    return { ok: true };
  });

export const handleNotification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; action: "approve" | "decline" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind !== "cleaner" && actor.kind !== "admin" && actor.kind !== "team") {
      throw new Error("Only office or team staff can handle these requests.");
    }
    const rows = await sql<NotificationRow>`
      select id, user_id, kind, title, body, job_id, client_id, client_name,
             request_id, requested_start_at::text as requested_start_at, status,
             created_at::text as created_at, handled_at::text as handled_at
      from notifications where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const n = rows[0];
    if (!n) throw new Error("Request not found.");
    if (n.kind === "cancel" || n.kind === "reschedule") {
      await assertActivePlan(sql, actor);
    }
    if (n.kind !== "cancel" && n.kind !== "reschedule") {
      await sql`
        update notifications set status = 'read', handled_at = now()
        where id = ${n.id}
      `;
      return { ok: true };
    }
    if (!n.job_id) throw new Error("This request has no visit attached.");
    const ownerId = masterUserId(actor);
    const jobs = await sql<{
      id: string;
      status: string;
      start_at: string;
      assigned_to_user_id: string | null;
      client_id: string;
    }>`
      select id, status, start_at::text as start_at, assigned_to_user_id, client_id
      from jobs where id = ${n.job_id} and cleaner_user_id = ${ownerId} limit 1
    `;
    const job = jobs[0];
    if (!job) throw new Error("Visit not found.");

    const newStatus = data.action === "approve" ? "approved" : "declined";
    if (n.kind === "cancel") {
      if (data.action === "approve") {
        await sql`update jobs set status = 'cancelled' where id = ${job.id}`;
      } else {
        await sql`update jobs set status = 'scheduled', cancel_reason = null where id = ${job.id}`;
      }
    } else if (n.kind === "reschedule") {
      if (data.action === "approve") {
        if (n.requested_start_at) {
          await sql`
            update jobs set status = 'scheduled', start_at = ${n.requested_start_at}::timestamptz,
              reschedule_note = null
            where id = ${job.id}
          `;
        } else {
          await sql`update jobs set status = 'scheduled' where id = ${job.id}`;
        }
      } else {
        await sql`
          update jobs set status = 'scheduled', reschedule_requested_at = null
          where id = ${job.id}
        `;
      }
    }

    await sql`
      update notifications set status = ${newStatus}, handled_at = now()
      where id = ${n.id}
    `;
    await sql`
      update notifications set status = ${newStatus}, handled_at = now()
      where job_id = ${job.id} and kind = ${n.kind} and status in ('unread', 'read')
    `;

    const linked = await sql<{ linked_user_id: string | null; name: string }>`
      select linked_user_id, name from clients where id = ${job.client_id} limit 1
    `;
    const clientUser = linked[0]?.linked_user_id;
    if (clientUser) {
      const approved = data.action === "approve";
      await insertNotification(sql, {
        userId: clientUser,
        kind: approved ? "request_approved" : "request_declined",
        title: approved
          ? n.kind === "cancel"
            ? "Your cancellation was accepted"
            : "Your reschedule was accepted"
          : n.kind === "cancel"
            ? "Your cancellation was declined — the visit stays on the book"
            : "Your reschedule was declined — the original time stays",
        body: n.kind === "reschedule" && approved && n.requested_start_at ? "The new time is confirmed." : null,
        jobId: job.id,
        clientId: job.client_id,
        clientName: linked[0]?.name ?? null,
        requestedStartAt: n.requested_start_at,
      });
    }
    return { ok: true };
  });
