import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertOffice, canChargeClients, getActor, masterUserId } from "./access";
import {
  applyAssigneesToClientRecurring,
  parseAssignees,
  replaceClientAssignees,
} from "./assignees";
import { insertNotification } from "./notifications";
import { ensureDemoSeed } from "./seed";
import { displayName, formatAddress, storePhone, type AddressParts } from "./people";
import { nid } from "./time";
import { standardTemplateId } from "./checklists";
import type { AssigneeRef, CardRow, ClientRow, InvoiceRow, JobRow, MessageRow } from "./types";

export type CsvRow = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  usual_day: string;
  usual_time: string;
  price: string;
  frequency: string;
};

const CLIENT_SELECT = `
  id, cleaner_user_id, linked_user_id, name, first_name, last_name, phone, email, address,
  address_line1, address_line2, city, state, zip, bedrooms, bathrooms, square_footage,
  access_notes, pets, supplies, default_price_cents, default_duration_min,
  usual_day, usual_time, frequency, notes, checklist_template_id,
  created_at::text as created_at,
  (select coalesce(json_agg(json_build_object('user_id', p.user_id, 'full_name', p.full_name) order by p.full_name), '[]'::json)
     from client_assignees ca join profiles p on p.user_id = ca.user_id
     where ca.client_id = clients.id) as assignees_json
`;

function withAssignees(row: ClientRow & { assignees_json?: unknown }): ClientRow {
  const assignees = parseAssignees(row.assignees_json);
  const { assignees_json: _ignored, ...rest } = row;
  return { ...rest, assignees, assigned_user_ids: assignees.map((a) => a.user_id) };
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const rows = await sql.query<ClientRow & { assignees_json?: unknown }>(
      `select ${CLIENT_SELECT} from clients where cleaner_user_id = $1 order by name asc`,
      [ownerId],
    );
    return rows.map(withAssignees);
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "cleaner" || actor.kind === "admin") {
      const ownerId = masterUserId(actor);
      const rows = await sql.query<ClientRow & { assignees_json?: unknown }>(
        `select ${CLIENT_SELECT} from clients where id = $1 and cleaner_user_id = $2 limit 1`,
        [id, ownerId],
      );
      const client = rows[0] ? withAssignees(rows[0]) : null;
      if (!client) throw new Error("Client not found.");
      const jobs = await sql<JobRow>`
        select id, cleaner_user_id, client_id, service, address, start_at::text as start_at,
               duration_min, price_cents, notes, status, recurrence, series_id,
               cancel_reason, reschedule_note, tip_cents, tip_requested,
               created_at::text as created_at
        from jobs where client_id = ${id} and cleaner_user_id = ${ownerId}
        order by start_at desc limit 40
      `;
      const invoices = await sql<InvoiceRow>`
        select id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
               method, kind, paid_at::text as paid_at, failure_reason, receipt_number,
               paid_note, created_at::text as created_at
        from invoices where client_id = ${id} and cleaner_user_id = ${ownerId}
        order by created_at desc limit 20
      `;
      const cards = canChargeClients(actor)
        ? await sql<CardRow>`
            select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
                   holder_name, source, is_default, failing, created_at::text as created_at
            from payment_cards where client_id = ${id} and cleaner_user_id = ${ownerId}
            order by is_default desc, created_at desc
          `
        : [];
      const messages =
        actor.kind === "admin"
          ? await sql<MessageRow>`
              select id, cleaner_user_id, client_id, sender_role, body, created_at::text as created_at,
                     read_at::text as read_at
              from messages
              where client_id = ${id} and cleaner_user_id = ${ownerId}
                and channel = 'admin_client'
                and coalesce(admin_user_id, team_user_id) = ${actor.userId}
              order by created_at desc limit 8
            `
          : await sql<MessageRow>`
              select id, cleaner_user_id, client_id, sender_role, body, created_at::text as created_at,
                     read_at::text as read_at
              from messages where client_id = ${id} and cleaner_user_id = ${ownerId}
              order by created_at desc limit 8
            `;
      const staff = await sql<{ user_id: string; full_name: string }>`
        select user_id, full_name from profiles
        where master_user_id = ${ownerId} and coalesce(team_status, 'active') = 'active'
          and coalesce(cleaner_kind, 'team') = 'team'
        order by full_name
      `;
      return { client, jobs, invoices, cards, messages, staff };
    }
    if (actor.kind === "client" && actor.client.id === id) {
      return {
        client: actor.client,
        jobs: [] as JobRow[],
        invoices: [] as InvoiceRow[],
        cards: [] as CardRow[],
        messages: [] as MessageRow[],
        staff: [] as { user_id: string; full_name: string }[],
      };
    }
    throw new Error("Client not found.");
  });

export type ClientInput = {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  access_notes?: string;
  pets?: string;
  supplies?: string;
  default_price_cents?: number | null;
  default_duration_min?: number | null;
  usual_day?: string;
  usual_time?: string;
  frequency?: string;
  notes?: string;
  checklist_template_id?: string | null;
};

function cleanClient(input: ClientInput) {
  const first_name = input.first_name.trim();
  const last_name = input.last_name.trim();
  const name = displayName(first_name, last_name);
  if (!name) throw new Error("First and last name are required.");
  const parts: AddressParts = {
    address_line1: input.address_line1?.trim() || "",
    address_line2: input.address_line2?.trim() || "",
    city: input.city?.trim() || "",
    state: (input.state?.trim() || "").toUpperCase(),
    zip: input.zip?.trim() || "",
  };
  return {
    name,
    first_name,
    last_name,
    phone: storePhone(input.phone),
    email: input.email?.trim() || null,
    address: formatAddress(parts) || null,
    address_line1: parts.address_line1 || null,
    address_line2: parts.address_line2 || null,
    city: parts.city || null,
    state: parts.state || null,
    zip: parts.zip || null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    square_footage: input.square_footage ?? null,
    access_notes: input.access_notes?.trim() || null,
    pets: input.pets?.trim() || null,
    supplies: input.supplies?.trim() || null,
    default_price_cents: input.default_price_cents ?? null,
    default_duration_min: input.default_duration_min ?? null,
    usual_day: input.usual_day?.trim() || null,
    usual_time: input.usual_time?.trim() || null,
    frequency: input.frequency?.trim() || null,
    notes: input.notes?.trim() || null,
    checklist_template_id: input.checklist_template_id?.trim() || null,
  };
}

export const createClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ClientInput) => cleanClient(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const id = nid("client");
    const templateId = data.checklist_template_id || (await standardTemplateId(sql, ownerId));
    await sql`
      insert into clients (
        id, cleaner_user_id, name, first_name, last_name, phone, email, address,
        address_line1, address_line2, city, state, zip, bedrooms, bathrooms, square_footage,
        access_notes, pets, supplies,
        default_price_cents, default_duration_min, usual_day, usual_time, frequency, notes,
        checklist_template_id
      ) values (
        ${id}, ${ownerId}, ${data.name}, ${data.first_name}, ${data.last_name}, ${data.phone}, ${data.email}, ${data.address},
        ${data.address_line1}, ${data.address_line2}, ${data.city}, ${data.state}, ${data.zip},
        ${data.bedrooms}, ${data.bathrooms}, ${data.square_footage},
        ${data.access_notes}, ${data.pets}, ${data.supplies}, ${data.default_price_cents},
        ${data.default_duration_min}, ${data.usual_day}, ${data.usual_time}, ${data.frequency},
        ${data.notes}, ${templateId}
      )
    `;
    return { id };
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ClientInput & { id: string }) => ({ id: input.id, ...cleanClient(input) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    await sql`
      update clients set
        name = ${data.name},
        first_name = ${data.first_name},
        last_name = ${data.last_name},
        phone = ${data.phone},
        email = ${data.email},
        address = ${data.address},
        address_line1 = ${data.address_line1},
        address_line2 = ${data.address_line2},
        city = ${data.city},
        state = ${data.state},
        zip = ${data.zip},
        bedrooms = ${data.bedrooms},
        bathrooms = ${data.bathrooms},
        square_footage = ${data.square_footage},
        access_notes = ${data.access_notes},
        pets = ${data.pets},
        supplies = ${data.supplies},
        default_price_cents = ${data.default_price_cents},
        default_duration_min = ${data.default_duration_min},
        usual_day = ${data.usual_day},
        usual_time = ${data.usual_time},
        frequency = ${data.frequency},
        notes = ${data.notes},
        checklist_template_id = ${data.checklist_template_id || (await standardTemplateId(sql, ownerId))}
      where id = ${data.id} and cleaner_user_id = ${ownerId}
    `;
    return { ok: true };
  });

export const setClientAssignees = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; userIds: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const owned = await sql<{ id: string; name: string }>`
      select id, name from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!owned[0]) throw new Error("Client not found.");
    const unique = [...new Set((data.userIds ?? []).filter(Boolean))];
    await replaceClientAssignees(sql, data.clientId, unique);
    await applyAssigneesToClientRecurring(sql, data.clientId, unique);
    for (const userId of unique) {
      await insertNotification(sql, {
        userId,
        kind: "job_assigned",
        title: `Assigned: ${owned[0].name}`,
        body: "You were assigned to this client's recurring visits.",
        clientId: data.clientId,
        clientName: owned[0].name,
      });
    }
    return { ok: true };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const owned = await sql<{ id: string; name: string }>`
      select id, name from clients where id = ${id} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!owned[0]) throw new Error("Client not found.");
    await sql`delete from job_assignees where job_id in (select id from jobs where client_id = ${id})`;
    await sql`delete from client_assignees where client_id = ${id}`;
    await sql`delete from messages where client_id = ${id}`;
    await sql`delete from invoices where client_id = ${id}`;
    await sql`delete from payment_cards where client_id = ${id}`;
    await sql`delete from invites where client_id = ${id}`;
    await sql`delete from card_links where client_id = ${id}`;
    await sql`delete from notifications where client_id = ${id}`;
    await sql`delete from jobs where client_id = ${id}`;
    await sql`delete from clients where id = ${id} and cleaner_user_id = ${ownerId}`;
    return { ok: true, name: owned[0].name };
  });

const CSV_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "notes",
  "usual_day",
  "usual_time",
  "price",
  "frequency",
] as const;

function parsePrice(raw: string): number | null {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * (n < 1000 ? 100 : 1));
}

export const importClients = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((rows: CsvRow[]) => rows)
  .handler(async ({ context, data: rows }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);

    const imported: { id: string; name: string; missing: string[] }[] = [];
    let skipped = 0;

    for (const row of rows) {
      const name = (row.name || "").trim();
      if (!name) {
        skipped += 1;
        continue;
      }
      const missing: string[] = [];
      for (const field of CSV_FIELDS) {
        if (field === "name") continue;
        if (!(row[field] || "").trim()) missing.push(field.replaceAll("_", " "));
      }
      const price = parsePrice(row.price || "");
      const id = nid("client");
      await sql`
        insert into clients (
          id, cleaner_user_id, name, phone, email, address, notes,
          usual_day, usual_time, frequency, default_price_cents
        ) values (
          ${id}, ${ownerId}, ${name}, ${row.phone?.trim() || null},
          ${row.email?.trim() || null}, ${row.address?.trim() || null},
          ${row.notes?.trim() || null}, ${row.usual_day?.trim().toLowerCase() || null},
          ${row.usual_time?.trim() || null}, ${row.frequency?.trim().toLowerCase() || null},
          ${price}
        )
      `;
      imported.push({ id, name, missing });
    }

    return {
      importedCount: imported.length,
      skipped,
      imported,
      missingCount: imported.filter((r) => r.missing.length).length,
    };
  });
