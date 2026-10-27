import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { JOB_FROM, JOB_SELECT, canChargeClients, getActor, isOffice, masterUserId } from "./access";
import { backfillPaidAt } from "./payments";
import { ensureDemoSeed } from "./seed";
import { addDaysChicago, startOfChicagoDay, chicagoDate, partsInChicago } from "./time";
import type { Actor, CardRow, InvoiceWithClient, JobWithClient, ThreadSummary } from "./types";
import { hydrateJob, redactJobMoney } from "./assignees";
import { loadThreads, unreadCount } from "./messages";
import { addressPartsFrom, formatAddress, namesFrom, storePhone } from "./people";

export type CleanerDashboard = {
  actor: Extract<Actor, { kind: "cleaner" | "admin" }>;
  today: JobWithClient[];
  week: JobWithClient[];
  unpaid: InvoiceWithClient[];
  threads: ThreadSummary[];
  unread: number;
  failed: InvoiceWithClient[];
  pendingRequests: number;
  pendingCleanRequests: number;
  unreadNotifications: number;
  revenue: { monthCents: number; ytdCents: number; monthLabel: string; year: number };
  showRevenue: boolean;
  canCharge: boolean;
};

export type TeamDashboard = {
  actor: Extract<Actor, { kind: "team" }>;
  today: JobWithClient[];
  week: JobWithClient[];
  unread: number;
  pendingRequests: number;
};

export type ClientDashboard = {
  actor: Extract<Actor, { kind: "client" }>;
  upcoming: JobWithClient[];
  past: JobWithClient[];
  unpaid: InvoiceWithClient[];
  cards: Pick<CardRow, "id" | "brand" | "last4" | "failing" | "is_default">[];
  next: JobWithClient | null;
  failedCard: boolean;
};

export type DashboardData =
  | CleanerDashboard
  | TeamDashboard
  | ClientDashboard
  | { actor: Extract<Actor, { kind: "none" | "client_unlinked" }> };

export function isCleanerDash(d: DashboardData): d is CleanerDashboard {
  return d.actor.kind === "cleaner" || d.actor.kind === "admin";
}

export function isTeamDash(d: DashboardData): d is TeamDashboard {
  return d.actor.kind === "team";
}

export function isClientDash(d: DashboardData): d is ClientDashboard {
  return d.actor.kind === "client";
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    const start = startOfChicagoDay(new Date());
    const endToday = addDaysChicago(start, 1);
    const endWeek = addDaysChicago(start, 7);

    if (isOffice(actor)) {
      const ownerId = masterUserId(actor);
      const today = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`,
        [ownerId, start.toISOString(), endToday.toISOString()],
      ).then((rows) => rows.map(hydrateJob));
      const week = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1 and j.start_at >= $2::timestamptz and j.start_at < $3::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`,
        [ownerId, start.toISOString(), endWeek.toISOString()],
      ).then((rows) => rows.map(hydrateJob));
      await backfillPaidAt(sql);
      const { removeStrayUnpaidInvoices } = await import("./payments");
      await removeStrayUnpaidInvoices(sql, ownerId);
      const unpaid = await sql.query<InvoiceWithClient>(
        `select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.paid_note, i.created_at::text as created_at, c.name as client_name,
                j.start_at::text as job_start_at
         from invoices i
         join clients c on c.id = i.client_id
         join jobs j on j.id = i.job_id
         where i.cleaner_user_id = $1
           and i.status in ('unpaid', 'failed')
           and i.kind <> 'tip'
           and j.status = 'completed'
           and j.start_at < $2::timestamptz
         order by j.start_at desc`,
        [ownerId, start.toISOString()],
      );
      const threads = (await loadThreads(sql, actor)).slice(0, 5);
      const unread = await unreadCount(sql, actor);
      const failed = unpaid.filter((i) => i.status === "failed");
      const reqs = await sql<{ n: number }>`
        select count(*)::int as n from notifications
        where user_id = ${context.userId} and status in ('unread', 'read')
          and kind in ('cancel', 'reschedule')
      `;
      const cleanReqs = await sql<{ n: number }>`
        select count(*)::int as n from clean_requests
        where cleaner_user_id = ${ownerId} and status = 'pending'
      `;
      const unreadNotes = await sql<{ n: number }>`
        select count(*)::int as n from notifications
        where user_id = ${context.userId} and status = 'unread'
      `;
      const p = partsInChicago(new Date());
      const monthStart = chicagoDate(p.year, p.month, 1, 0, 0);
      const nextMonth = p.month === 12 ? chicagoDate(p.year + 1, 1, 1, 0, 0) : chicagoDate(p.year, p.month + 1, 1, 0, 0);
      const yearStart = chicagoDate(p.year, 1, 1, 0, 0);
      const yearEnd = chicagoDate(p.year + 1, 1, 1, 0, 0);
      const monthRows = await sql<{ n: number }>`
        select coalesce(sum(s.amt), 0)::int as n
        from (
          select distinct on (i.job_id) i.amount_cents as amt
          from invoices i
          where i.cleaner_user_id = ${ownerId}
            and i.status = 'paid' and i.kind = 'visit' and i.job_id is not null
            and i.paid_at >= ${monthStart.toISOString()}::timestamptz
            and i.paid_at < ${nextMonth.toISOString()}::timestamptz
          order by i.job_id, i.paid_at desc
        ) s
      `;
      const yearRows = await sql<{ n: number }>`
        select coalesce(sum(s.amt), 0)::int as n
        from (
          select distinct on (i.job_id) i.amount_cents as amt
          from invoices i
          where i.cleaner_user_id = ${ownerId}
            and i.status = 'paid' and i.kind = 'visit' and i.job_id is not null
            and i.paid_at >= ${yearStart.toISOString()}::timestamptz
            and i.paid_at < ${yearEnd.toISOString()}::timestamptz
          order by i.job_id, i.paid_at desc
        ) s
      `;
      const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" }).format(new Date());
      return {
        actor,
        today,
        week,
        unpaid,
        threads,
        unread,
        failed,
        pendingRequests: Number(reqs[0]?.n || 0),
        pendingCleanRequests: Number(cleanReqs[0]?.n || 0),
        unreadNotifications: Number(unreadNotes[0]?.n || 0),
        revenue: {
          monthCents: Number(monthRows[0]?.n || 0),
          ytdCents: Number(yearRows[0]?.n || 0),
          monthLabel,
          year: p.year,
        },
        showRevenue: actor.kind === "cleaner",
        canCharge: canChargeClients(actor),
      } satisfies CleanerDashboard;
    }

    if (actor.kind === "team") {
      const today = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`,
        [actor.masterUserId, context.userId, start.toISOString(), endToday.toISOString()],
      ).then((rows) => rows.map(hydrateJob).map(redactJobMoney));
      const week = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.cleaner_user_id = $1
           and exists (select 1 from job_assignees ja where ja.job_id = j.id and ja.user_id = $2)
           and j.start_at >= $3::timestamptz and j.start_at < $4::timestamptz
           and j.status <> 'cancelled'
         order by j.start_at asc`,
        [actor.masterUserId, context.userId, start.toISOString(), endWeek.toISOString()],
      ).then((rows) => rows.map(hydrateJob).map(redactJobMoney));
      const unreadMessages = await unreadCount(sql, actor);
      const reqs = await sql<{ n: number }>`
        select count(*)::int as n from notifications
        where user_id = ${context.userId} and status in ('unread', 'read')
          and kind in ('cancel', 'reschedule')
      `;
      return {
        actor,
        today,
        week,
        unread: unreadMessages,
        pendingRequests: Number(reqs[0]?.n || 0),
      } satisfies TeamDashboard;
    }

    if (actor.kind === "client") {
      const upcoming = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and j.start_at >= $2::timestamptz and j.status in ('scheduled', 'reschedule_requested')
         order by j.start_at asc
         limit 12`,
        [actor.client.id, start.toISOString()],
      ).then((rows) => rows.map(hydrateJob));
      const past = await sql.query<JobWithClient>(
        `select ${JOB_SELECT} from ${JOB_FROM}
         where j.client_id = $1 and (j.start_at < $2::timestamptz or j.status in ('completed', 'cancelled'))
         order by j.start_at desc
         limit 12`,
        [actor.client.id, start.toISOString()],
      ).then((rows) => rows.map(hydrateJob));
      await backfillPaidAt(sql);
      const unpaid = await sql.query<InvoiceWithClient>(
        `select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.paid_note, i.created_at::text as created_at, c.name as client_name,
                j.start_at::text as job_start_at
         from invoices i
         join clients c on c.id = i.client_id
         left join jobs j on j.id = i.job_id
         where i.client_id = $1 and i.status in ('unpaid', 'failed')
         order by i.created_at desc`,
        [actor.client.id],
      );
      const cards = await sql<{ id: string; brand: string; last4: string; failing: boolean; is_default: boolean }>`
        select id, brand, last4, failing, is_default from payment_cards
        where client_id = ${actor.client.id} order by is_default desc
      `;
      return {
        actor,
        upcoming,
        past,
        unpaid,
        cards,
        next: upcoming[0] ?? null,
        failedCard: unpaid.some((i) => i.status === "failed") || cards.some((c) => c.failing),
      } satisfies ClientDashboard;
    }

    return { actor };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    firstName: string;
    lastName: string;
    businessName?: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    cancellationPolicy?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const names = namesFrom(data.firstName, data.lastName);
    if (!names.first_name || !names.last_name) throw new Error("First and last name are required.");
    const phone = storePhone(data.phone);
    const email = data.email?.trim() || null;
    const parts = addressPartsFrom(data);
    const address = formatAddress(parts) || null;
    if (actor.kind === "cleaner") {
      await sql`
        update profiles set
          full_name = ${names.name},
          first_name = ${names.first_name},
          last_name = ${names.last_name},
          business_name = ${data.businessName?.trim() || null},
          phone = ${phone},
          email = ${email},
          address = ${address},
          address_line1 = ${parts.address_line1 || null},
          address_line2 = ${parts.address_line2 || null},
          city = ${parts.city || null},
          state = ${parts.state || null},
          zip = ${parts.zip || null},
          cancellation_policy = ${data.cancellationPolicy?.trim() || null}
        where user_id = ${context.userId}
      `;
      await sql`update "user" set name = ${names.name} where id = ${context.userId}`;
      return { ok: true };
    }
    if (actor.kind === "team" || actor.kind === "admin") {
      await sql`
        update profiles set
          full_name = ${names.name},
          first_name = ${names.first_name},
          last_name = ${names.last_name},
          phone = ${phone},
          email = ${email}
        where user_id = ${context.userId}
      `;
      await sql`update "user" set name = ${names.name} where id = ${context.userId}`;
      return { ok: true };
    }
    if (actor.kind === "client") {
      await sql`
        update profiles set
          full_name = ${names.name},
          first_name = ${names.first_name},
          last_name = ${names.last_name},
          phone = ${phone},
          email = ${email},
          address = ${address},
          address_line1 = ${parts.address_line1 || null},
          address_line2 = ${parts.address_line2 || null},
          city = ${parts.city || null},
          state = ${parts.state || null},
          zip = ${parts.zip || null}
        where user_id = ${context.userId}
      `;
      await sql`update "user" set name = ${names.name} where id = ${context.userId}`;
      await sql`
        update clients set
          name = ${names.name},
          first_name = ${names.first_name},
          last_name = ${names.last_name},
          phone = ${phone},
          email = ${email},
          address = ${address},
          address_line1 = ${parts.address_line1 || null},
          address_line2 = ${parts.address_line2 || null},
          city = ${parts.city || null},
          state = ${parts.state || null},
          zip = ${parts.zip || null}
        where linked_user_id = ${context.userId}
      `;
      return { ok: true };
    }
    throw new Error("Sign in to edit settings.");
  });
