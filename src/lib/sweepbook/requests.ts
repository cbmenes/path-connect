import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertOffice, getActor, masterUserId } from "./access";
import { replaceJobAssignees } from "./assignees";
import { insertNotification } from "./notifications";
import { ensureDemoSeed } from "./seed";
import { fromDatetimeLocalValue, nid, toDatetimeLocalValue, weekdayNameInChicago } from "./time";
import { DEMO_CLEANER_ID } from "./types";
import type { CleanRequest, CleanServiceType } from "./types";

const SERVICE_TYPES: CleanServiceType[] = ["one-time", "weekly", "biweekly", "monthly"];

type MasterRow = {
  user_id: string;
  full_name: string;
  business_name: string | null;
  default_duration_min: number;
  default_rate_cents: number;
};

export function serviceTypeLabel(type: string) {
  if (type === "one-time") return "One-time";
  if (type === "weekly") return "Weekly";
  if (type === "biweekly") return "Every other week";
  if (type === "monthly") return "Monthly";
  return type;
}

function frequencyFromService(type: CleanServiceType) {
  return type === "one-time" ? "one-off" : type;
}

function normalizeTime(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (/^\d{1,2}:\d{2}/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m.slice(0, 2)}`;
  }
  return "09:00";
}

function startLocalFromPreferred(date: string | null, time: string | null) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date}T${normalizeTime(time)}`;
  }
  return toDatetimeLocalValue(new Date());
}

async function resolveMaster(sql: Awaited<ReturnType<typeof getSql>>): Promise<MasterRow | null> {
  const preferred = await sql<MasterRow>`
    select user_id, full_name, business_name, default_duration_min, default_rate_cents
    from profiles
    where user_id = ${DEMO_CLEANER_ID} and role = 'cleaner'
    limit 1
  `;
  if (preferred[0]) return preferred[0];
  const rows = await sql<MasterRow>`
    select user_id, full_name, business_name, default_duration_min, default_rate_cents
    from profiles
    where role = 'cleaner' and coalesce(cleaner_kind, 'master') = 'master'
    order by created_at asc
    limit 1
  `;
  return rows[0] ?? null;
}

async function loadRequest(
  sql: Awaited<ReturnType<typeof getSql>>,
  id: string,
  ownerId: string,
) {
  const rows = await sql<CleanRequest>`
    select id, cleaner_user_id, name, phone, email, address, service_type,
           preferred_date, preferred_time, notes, status, decline_note, job_id, client_id,
           created_at::text as created_at, handled_at::text as handled_at
    from clean_requests
    where id = ${id} and cleaner_user_id = ${ownerId}
    limit 1
  `;
  return rows[0] ?? null;
}

export const getPublicBookInfo = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await ensureDemoSeed(sql);
  const master = await resolveMaster(sql);
  if (!master) throw new Error("This book is not accepting requests yet.");
  return {
    businessName: master.business_name || master.full_name,
    cleanerName: master.full_name,
  };
});

export type SubmitCleanRequestInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceType: CleanServiceType;
  preferredDate: string;
  preferredTime?: string;
  notes?: string;
};

function parseSubmit(input: SubmitCleanRequestInput): SubmitCleanRequestInput {
  const name = input.name?.trim() || "";
  const phone = input.phone?.trim() || "";
  const email = input.email?.trim() || "";
  const address = input.address?.trim() || "";
  if (!name) throw new Error("Please enter your name.");
  if (!phone) throw new Error("Please enter a phone number.");
  if (!email || !email.includes("@")) throw new Error("Please enter an email.");
  if (!address) throw new Error("Please enter the address to clean.");
  if (!SERVICE_TYPES.includes(input.serviceType)) throw new Error("Choose a service type.");
  if (!input.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate)) {
    throw new Error("Choose a preferred date.");
  }
  return {
    name,
    phone,
    email,
    address,
    serviceType: input.serviceType,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime?.trim() || "",
    notes: input.notes?.trim() || "",
  };
}

export const submitCleanRequest = createServerFn({ method: "POST" })
  .validator((input: SubmitCleanRequestInput) => parseSubmit(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const master = await resolveMaster(sql);
    if (!master) throw new Error("This book is not accepting requests yet.");
    const id = nid("req");
    await sql`
      insert into clean_requests (
        id, cleaner_user_id, name, phone, email, address, service_type,
        preferred_date, preferred_time, notes, status
      ) values (
        ${id}, ${master.user_id}, ${data.name}, ${data.phone}, ${data.email}, ${data.address},
        ${data.serviceType}, ${data.preferredDate}, ${data.preferredTime || null},
        ${data.notes || null}, ${"pending"}
      )
    `;
    await insertNotification(sql, {
      userId: master.user_id,
      kind: "clean_request",
      title: `New clean request from ${data.name}`,
      body: `${serviceTypeLabel(data.serviceType)} · ${data.preferredDate}${data.preferredTime ? ` ${data.preferredTime}` : ""}`,
      requestId: id,
      clientName: data.name,
    });
    return { id };
  });

export const listCleanRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    return sql<CleanRequest>`
      select id, cleaner_user_id, name, phone, email, address, service_type,
             preferred_date, preferred_time, notes, status, decline_note, job_id, client_id,
             created_at::text as created_at, handled_at::text as handled_at
      from clean_requests
      where cleaner_user_id = ${ownerId}
      order by created_at desc
    `;
  });

export type CleanRequestDetail = {
  request: CleanRequest;
  defaults: {
    startLocal: string;
    durationMin: number;
    priceCents: number;
    service: string;
    existingClientId: string | null;
    existingClientName: string | null;
  };
};

export const getCleanRequest = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }): Promise<CleanRequestDetail> => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const request = await loadRequest(sql, id, ownerId);
    if (!request) throw new Error("Request not found.");
    const master = await sql<MasterRow>`
      select user_id, full_name, business_name, default_duration_min, default_rate_cents
      from profiles where user_id = ${ownerId} limit 1
    `;
    const email = request.email?.trim().toLowerCase();
    const existing = email
      ? await sql<{
          id: string;
          name: string;
          default_price_cents: number | null;
          default_duration_min: number | null;
        }>`
          select id, name, default_price_cents, default_duration_min
          from clients
          where cleaner_user_id = ${ownerId} and lower(email) = ${email}
          limit 1
        `
      : [];
    const client = existing[0];
    return {
      request,
      defaults: {
        startLocal: startLocalFromPreferred(request.preferred_date, request.preferred_time),
        durationMin: Number(client?.default_duration_min || master[0]?.default_duration_min || 120),
        priceCents: Number(client?.default_price_cents || master[0]?.default_rate_cents || 15000),
        service: "House cleaning",
        existingClientId: client?.id ?? null,
        existingClientName: client?.name ?? null,
      },
    };
  });

export type AcceptCleanRequestInput = {
  id: string;
  startLocal: string;
  durationMin: number;
  priceCents: number;
  assignedToUserIds?: string[];
  service?: string;
  notes?: string;
};

function parseAccept(input: AcceptCleanRequestInput): AcceptCleanRequestInput {
  if (!input.id) throw new Error("Request is missing.");
  if (!input.startLocal) throw new Error("Choose a date and time.");
  const durationMin = Number(input.durationMin);
  const priceCents = Number(input.priceCents);
  if (!durationMin || durationMin < 30) throw new Error("Duration must be at least 0.5 hours.");
  if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error("Enter a price.");
  return {
    id: input.id,
    startLocal: input.startLocal,
    durationMin,
    priceCents,
    assignedToUserIds: [...new Set((input.assignedToUserIds ?? []).filter(Boolean))],
    service: input.service?.trim() || "House cleaning",
    notes: input.notes?.trim() || "",
  };
}

export const acceptCleanRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AcceptCleanRequestInput) => parseAccept(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const request = await loadRequest(sql, data.id, ownerId);
    if (!request) throw new Error("Request not found.");
    if (request.status !== "pending") throw new Error("This request was already handled.");

    const email = request.email?.trim().toLowerCase() || "";
    const existing = email
      ? await sql<{ id: string; address: string | null; notes: string | null; name: string }>`
          select id, address, notes, name from clients
          where cleaner_user_id = ${ownerId} and lower(email) = ${email}
          limit 1
        `
      : [];
    let clientId = existing[0]?.id;
    let clientName = existing[0]?.name || request.name;
    if (!clientId) {
      clientId = nid("client");
      const start = fromDatetimeLocalValue(data.startLocal);
      await sql`
        insert into clients (
          id, cleaner_user_id, name, phone, email, address, notes,
          default_price_cents, default_duration_min, usual_day, usual_time, frequency
        ) values (
          ${clientId}, ${ownerId}, ${request.name}, ${request.phone}, ${request.email},
          ${request.address}, ${request.notes}, ${data.priceCents}, ${data.durationMin},
          ${weekdayNameInChicago(start)}, ${normalizeTime(request.preferred_time)},
          ${frequencyFromService(request.service_type)}
        )
      `;
      clientName = request.name;
    }

    const start = fromDatetimeLocalValue(data.startLocal);
    const jobId = nid("job");
    const assigneeIds = data.assignedToUserIds ?? [];
    await sql`
      insert into jobs (
        id, cleaner_user_id, client_id, service, address, start_at, duration_min,
        price_cents, notes, status, recurrence, series_id, assigned_to_user_id
      ) values (
        ${jobId}, ${ownerId}, ${clientId}, ${data.service || "House cleaning"},
        ${request.address || existing[0]?.address || null}, ${start.toISOString()}, ${data.durationMin},
        ${data.priceCents}, ${data.notes || request.notes || null}, ${"scheduled"}, ${"none"}, ${null},
        ${assigneeIds[0] ?? null}
      )
    `;
    await replaceJobAssignees(sql, jobId, assigneeIds);
    if (assigneeIds.length) {
      for (const userId of assigneeIds) {
        await insertNotification(sql, {
          userId,
          kind: "job_assigned",
          title: `Assigned: ${clientName}`,
          body: "A visit was assigned to you.",
          jobId,
          clientId,
          clientName,
        });
      }
    }

    await sql`
      update clean_requests
      set status = ${"accepted"}, job_id = ${jobId}, client_id = ${clientId}, handled_at = now()
      where id = ${request.id}
    `;
    await sql`
      update notifications
      set status = ${"approved"}, handled_at = now()
      where request_id = ${request.id} and kind = ${"clean_request"} and status in ('unread', 'read')
    `;
    return { jobId, clientId };
  });

export const declineCleanRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; note?: string }) => ({
    id: input.id,
    note: input.note?.trim() || "",
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const request = await loadRequest(sql, data.id, ownerId);
    if (!request) throw new Error("Request not found.");
    if (request.status !== "pending") throw new Error("This request was already handled.");
    await sql`
      update clean_requests
      set status = ${"declined"}, decline_note = ${data.note || null}, handled_at = now()
      where id = ${request.id}
    `;
    await sql`
      update notifications
      set status = ${"declined"}, handled_at = now()
      where request_id = ${request.id} and kind = ${"clean_request"} and status in ('unread', 'read')
    `;
    return { ok: true };
  });
