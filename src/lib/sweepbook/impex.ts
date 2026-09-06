import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCleaner, getActor } from "./access";
import { replaceClientAssignees, replaceJobAssignees } from "./assignees";
import {
  centsToPrice,
  frequencyToCsv,
  frequencyToDb,
  inferNameFromEmail,
  isValidDate,
  isValidTime,
  normalizeTime,
  parseEmails,
  parseHours,
  parseMoneyToCents,
  parseYesNo,
  scheduleStatus,
  toCsv,
  weekdayToCsv,
  weekdayToDb,
  type CsvKind,
  type ImportMode,
} from "./csv";
import { chicagoDate, hoursToMinutes, minutesToHours, nid, partsInChicago } from "./time";

export type ImportSkip = { row: number; reason: string };
export type ImportWarning = { row: number; message: string };
export type ImportResult = {
  imported: number;
  skipped: number;
  skips: ImportSkip[];
  warnings: ImportWarning[];
};

type TeamRef = { user_id: string; email: string; full_name: string };

async function loadTeamByEmail(sql: Awaited<ReturnType<typeof getSql>>, ownerId: string) {
  const rows = await sql<TeamRef>`
    select user_id, lower(email) as email, full_name
    from profiles
    where master_user_id = ${ownerId}
      and role = ${"cleaner"}
      and email is not null
      and coalesce(team_status, 'active') = 'active'
  `;
  const map = new Map<string, TeamRef>();
  for (const row of rows) {
    if (row.email) map.set(row.email, row);
  }
  return map;
}

function resolveAssignees(raw: string, team: Map<string, TeamRef>, row: number, warnings: ImportWarning[]) {
  const ids: string[] = [];
  for (const email of parseEmails(raw)) {
    const hit = team.get(email);
    if (hit) ids.push(hit.user_id);
    else warnings.push({ row, message: `Unknown cleaner email ignored: ${email}` });
  }
  return [...new Set(ids)];
}

function receiptNo() {
  return `SB-${Math.floor(100000 + Math.random() * 900000)}`;
}

export const exportCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((kind: CsvKind) => kind)
  .handler(async ({ context, data: kind }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);

    if (kind === "clients") {
      const rows = await sql<{
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        notes: string | null;
        default_price_cents: number | null;
        default_duration_min: number | null;
        frequency: string | null;
        usual_day: string | null;
        usual_time: string | null;
        assigned: string | null;
      }>`
        select c.name, c.phone, c.email, c.address, c.notes, c.default_price_cents, c.default_duration_min,
               c.frequency, c.usual_day, c.usual_time,
               (select string_agg(p.email, ';' order by p.email)
                  from client_assignees ca
                  join profiles p on p.user_id = ca.user_id
                 where ca.client_id = c.id and p.email is not null) as assigned
        from clients c
        where c.cleaner_user_id = ${context.userId}
        order by c.name
      `;
      const csv = toCsv(
        [
          "name",
          "phone",
          "email",
          "address",
          "notes",
          "default_price",
          "default_duration_hours",
          "frequency",
          "preferred_weekday",
          "preferred_time",
          "assigned_cleaner_emails",
        ],
        rows.map((r) => ({
          name: r.name,
          phone: r.phone,
          email: r.email,
          address: r.address,
          notes: r.notes,
          default_price: centsToPrice(r.default_price_cents),
          default_duration_hours: r.default_duration_min ? String(minutesToHours(r.default_duration_min)) : "",
          frequency: frequencyToCsv(r.frequency),
          preferred_weekday: weekdayToCsv(r.usual_day),
          preferred_time: r.usual_time ?? "",
          assigned_cleaner_emails: r.assigned ?? "",
        })),
      );
      return { filename: "sweepbook-clients.csv", csv };
    }

    if (kind === "team") {
      const members = await sql<{
        full_name: string;
        phone: string | null;
        email: string | null;
        can_message: boolean | string;
      }>`
        select full_name, phone, email, can_message
        from profiles
        where master_user_id = ${context.userId} and role = ${"cleaner"}
        order by full_name
      `;
      const pending = await sql<{
        name: string;
        phone: string | null;
        email: string | null;
        can_message: boolean | string;
      }>`
        select name, phone, email, can_message
        from team_invites
        where master_user_id = ${context.userId} and accepted_at is null
        order by name
      `;
      const yes = (v: boolean | string) => (v === true || v === "t" || v === "true" ? "yes" : "no");
      const csv = toCsv(
        ["name", "phone", "email", "messaging_enabled"],
        [
          ...members.map((m) => ({
            name: m.full_name,
            phone: m.phone,
            email: m.email,
            messaging_enabled: yes(m.can_message),
          })),
          ...pending.map((m) => ({
            name: m.name,
            phone: m.phone,
            email: m.email,
            messaging_enabled: yes(m.can_message),
          })),
        ],
      );
      return { filename: "sweepbook-team.csv", csv };
    }

    const jobs = await sql<{
      client_email: string | null;
      start_at: string;
      duration_min: number;
      price_cents: number;
      notes: string | null;
      status: string;
      payment_status: string | null;
      assigned: string | null;
    }>`
      select c.email as client_email, j.start_at::text as start_at, j.duration_min, j.price_cents, j.notes, j.status,
             (select i.status from invoices i
               where i.job_id = j.id and i.kind = 'visit'
               order by case when i.status = 'paid' then 0 else 1 end, i.created_at desc
               limit 1) as payment_status,
             (select string_agg(p.email, ';' order by p.email)
                from job_assignees ja
                join profiles p on p.user_id = ja.user_id
               where ja.job_id = j.id and p.email is not null) as assigned
      from jobs j
      join clients c on c.id = j.client_id
      where j.cleaner_user_id = ${context.userId}
      order by j.start_at asc
    `;
    const csv = toCsv(
      ["client_email", "date", "time", "duration_hours", "price", "assigned_cleaner_emails", "notes", "status"],
      jobs.map((j) => {
        const p = partsInChicago(j.start_at);
        let status = "scheduled";
        if (j.status === "cancelled") status = "cancelled";
        else if (j.payment_status === "paid") status = "paid";
        else if (j.payment_status === "unpaid" || j.payment_status === "failed") status = "unpaid";
        return {
          client_email: j.client_email ?? "",
          date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
          time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
          duration_hours: String(minutesToHours(j.duration_min)),
          price: centsToPrice(j.price_cents),
          assigned_cleaner_emails: j.assigned ?? "",
          notes: j.notes,
          status,
        };
      }),
    );
    return { filename: "sweepbook-schedule.csv", csv };
  });

async function importClientRows(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  rows: Record<string, string>[],
  mode: ImportMode,
): Promise<ImportResult> {
  const team = await loadTeamByEmail(sql, ownerId);
  const existing = await sql<{ id: string; email: string }>`
    select id, lower(email) as email from clients
    where cleaner_user_id = ${ownerId} and email is not null
  `;
  const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email, c.id]));
  const skips: ImportSkip[] = [];
  const warnings: ImportWarning[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    const name = (row.name || "").trim();
    if (!name) {
      skips.push({ row: n, reason: "missing name" });
      continue;
    }
    const email = (row.email || "").trim().toLowerCase();
    const price = parseMoneyToCents(row.default_price || "");
    const hours = parseHours(row.default_duration_hours || "");
    const frequency = frequencyToDb(row.frequency || "") || null;
    const weekday = weekdayToDb(row.preferred_weekday || "") || null;
    const time = row.preferred_time?.trim() || null;
    const assignees = resolveAssignees(row.assigned_cleaner_emails || "", team, n, warnings);
    const payload = {
      name,
      phone: row.phone?.trim() || null,
      email: email || null,
      address: row.address?.trim() || null,
      notes: row.notes?.trim() || null,
      default_price_cents: price,
      default_duration_min: hours ? hoursToMinutes(hours) : null,
      frequency,
      usual_day: weekday,
      usual_time: time,
    };

    const match = email ? byEmail.get(email) : undefined;
    if (match && mode === "add") {
      skips.push({ row: n, reason: "duplicate email" });
      continue;
    }
    if (match && mode === "replace") {
      await sql`
        update clients set
          name = ${payload.name},
          phone = ${payload.phone},
          email = ${payload.email},
          address = ${payload.address},
          notes = ${payload.notes},
          default_price_cents = ${payload.default_price_cents},
          default_duration_min = ${payload.default_duration_min},
          frequency = ${payload.frequency},
          usual_day = ${payload.usual_day},
          usual_time = ${payload.usual_time}
        where id = ${match} and cleaner_user_id = ${ownerId}
      `;
      await replaceClientAssignees(sql, match, assignees);
      imported += 1;
      continue;
    }
    const id = nid("client");
    await sql`
      insert into clients (
        id, cleaner_user_id, name, phone, email, address, notes,
        default_price_cents, default_duration_min, frequency, usual_day, usual_time
      ) values (
        ${id}, ${ownerId}, ${payload.name}, ${payload.phone}, ${payload.email},
        ${payload.address}, ${payload.notes}, ${payload.default_price_cents},
        ${payload.default_duration_min}, ${payload.frequency}, ${payload.usual_day},
        ${payload.usual_time}
      )
    `;
    await replaceClientAssignees(sql, id, assignees);
    if (email) byEmail.set(email, id);
    imported += 1;
  }
  return { imported, skipped: skips.length, skips, warnings };
}

async function importTeamRows(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  rows: Record<string, string>[],
  mode: ImportMode,
): Promise<ImportResult> {
  const members = await sql<{ user_id: string; email: string }>`
    select user_id, lower(email) as email from profiles
    where master_user_id = ${ownerId} and role = ${"cleaner"} and email is not null
  `;
  const invites = await sql<{ id: string; email: string }>`
    select id, lower(email) as email from team_invites
    where master_user_id = ${ownerId} and accepted_at is null and email is not null
  `;
  const memberByEmail = new Map(members.filter((m) => m.email).map((m) => [m.email, m.user_id]));
  const inviteByEmail = new Map(invites.filter((m) => m.email).map((m) => [m.email, m.id]));
  const skips: ImportSkip[] = [];
  const warnings: ImportWarning[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    const name = (row.name || "").trim();
    if (!name) {
      skips.push({ row: n, reason: "missing name" });
      continue;
    }
    const email = (row.email || "").trim().toLowerCase();
    const phone = row.phone?.trim() || null;
    const messaging = parseYesNo(row.messaging_enabled || "yes");
    const canMessage = messaging !== false;
    if (row.messaging_enabled?.trim() && messaging == null) {
      warnings.push({ row: n, message: "messaging_enabled should be yes or no; defaulted to yes" });
    }

    if (email && memberByEmail.has(email)) {
      if (mode === "add") {
        skips.push({ row: n, reason: "duplicate email" });
        continue;
      }
      const userId = memberByEmail.get(email)!;
      await sql`
        update profiles
        set full_name = ${name}, phone = ${phone}, can_message = ${canMessage}
        where user_id = ${userId}
      `;
      imported += 1;
      continue;
    }
    if (email && inviteByEmail.has(email)) {
      if (mode === "add") {
        skips.push({ row: n, reason: "duplicate email" });
        continue;
      }
      await sql`
        update team_invites
        set name = ${name}, phone = ${phone}, can_message = ${canMessage}
        where id = ${inviteByEmail.get(email)!}
      `;
      imported += 1;
      continue;
    }

    const token = nid("tinv").replace(/-/g, "").slice(0, 22);
    const id = nid("tinv");
    await sql`
      insert into team_invites (id, token, master_user_id, name, phone, email, can_message)
      values (${id}, ${token}, ${ownerId}, ${name}, ${phone}, ${email || null}, ${canMessage})
    `;
    if (email) inviteByEmail.set(email, id);
    imported += 1;
  }
  return { imported, skipped: skips.length, skips, warnings };
}

async function upsertVisitInvoice(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  clientId: string,
  jobId: string,
  amountCents: number,
  status: "paid" | "unpaid",
) {
  const existing = await sql<{ id: string }>`
    select id from invoices
    where job_id = ${jobId} and kind = ${"visit"} and cleaner_user_id = ${ownerId}
    limit 1
  `;
  if (existing[0]) {
    await sql`
      update invoices set
        amount_cents = ${amountCents},
        status = ${status},
        paid_at = ${status === "paid" ? new Date().toISOString() : null},
        receipt_number = ${status === "paid" ? receiptNo() : null}
      where id = ${existing[0].id}
    `;
    return;
  }
  await sql`
    insert into invoices (
      id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
      method, kind, paid_at, receipt_number
    ) values (
      ${nid("inv")}, ${ownerId}, ${clientId}, ${jobId}, ${amountCents},
      ${"House cleaning"}, ${status}, ${status === "paid" ? "outside" : null},
      ${"visit"}, ${status === "paid" ? new Date().toISOString() : null},
      ${status === "paid" ? receiptNo() : null}
    )
  `;
}

async function importScheduleRows(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  rows: Record<string, string>[],
  mode: ImportMode,
): Promise<ImportResult> {
  const team = await loadTeamByEmail(sql, ownerId);
  const clients = await sql<{
    id: string;
    email: string;
    name: string;
    address: string | null;
    default_price_cents: number | null;
    default_duration_min: number | null;
  }>`
    select id, lower(email) as email, name, address, default_price_cents, default_duration_min
    from clients
    where cleaner_user_id = ${ownerId} and email is not null
  `;
  const clientByEmail = new Map(clients.filter((c) => c.email).map((c) => [c.email, c]));
  const skips: ImportSkip[] = [];
  const warnings: ImportWarning[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    const email = (row.client_email || "").trim().toLowerCase();
    if (!email) {
      skips.push({ row: n, reason: "unknown client_email" });
      continue;
    }
    if (!isValidDate(row.date || "")) {
      skips.push({ row: n, reason: "bad date" });
      continue;
    }
    if (!isValidTime(row.time || "")) {
      skips.push({ row: n, reason: "bad time" });
      continue;
    }
    const status = scheduleStatus(row.status || "scheduled") || "scheduled";
    const hours = parseHours(row.duration_hours || "");
    const price = parseMoneyToCents(row.price || "");
    let client = clientByEmail.get(email);
    if (!client) {
      const inferred = inferNameFromEmail(email);
      if (!inferred) {
        skips.push({ row: n, reason: "unknown client_email" });
        continue;
      }
      const id = nid("client");
      await sql`
        insert into clients (id, cleaner_user_id, name, email)
        values (${id}, ${ownerId}, ${inferred}, ${email})
      `;
      client = {
        id,
        email,
        name: inferred,
        address: null,
        default_price_cents: null,
        default_duration_min: null,
      };
      clientByEmail.set(email, client);
      warnings.push({ row: n, message: `Created client ${inferred} from ${email}` });
    }

    const durationMin = hours ? hoursToMinutes(hours) : client.default_duration_min || 120;
    if (durationMin < 30) {
      skips.push({ row: n, reason: "bad duration" });
      continue;
    }
    const priceCents = price ?? client.default_price_cents ?? 0;
    const [y, m, d] = row.date.split("-").map(Number);
    const [hh, mm] = normalizeTime(row.time).split(":").map(Number);
    const start = chicagoDate(y, m, d, hh, mm);
    const assignees = resolveAssignees(row.assigned_cleaner_emails || "", team, n, warnings);
    const jobStatus = status === "cancelled" ? "cancelled" : "scheduled";

    const existing = await sql<{ id: string }>`
      select id from jobs
      where cleaner_user_id = ${ownerId} and client_id = ${client.id}
        and start_at = ${start.toISOString()}::timestamptz
      limit 1
    `;
    if (existing[0] && mode === "add") {
      skips.push({ row: n, reason: "duplicate visit" });
      continue;
    }

    let jobId = existing[0]?.id;
    if (jobId && mode === "replace") {
      await sql`
        update jobs set
          duration_min = ${durationMin},
          price_cents = ${priceCents},
          notes = ${row.notes?.trim() || null},
          status = ${jobStatus},
          assigned_to_user_id = ${assignees[0] ?? null}
        where id = ${jobId}
      `;
    } else {
      jobId = nid("job");
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address, start_at, duration_min,
          price_cents, notes, status, recurrence, assigned_to_user_id
        ) values (
          ${jobId}, ${ownerId}, ${client.id}, ${"House cleaning"}, ${client.address},
          ${start.toISOString()}, ${durationMin}, ${priceCents}, ${row.notes?.trim() || null},
          ${jobStatus}, ${"none"}, ${assignees[0] ?? null}
        )
      `;
    }
    await replaceJobAssignees(sql, jobId, assignees);
    if (status === "paid" || status === "unpaid") {
      await upsertVisitInvoice(sql, ownerId, client.id, jobId, priceCents, status);
    }
    imported += 1;
  }
  return { imported, skipped: skips.length, skips, warnings };
}

export const importCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: CsvKind; mode: ImportMode; rows: Record<string, string>[] }) => {
    if (input.kind !== "clients" && input.kind !== "team" && input.kind !== "schedule") {
      throw new Error("Choose Clients, Team, or Schedule.");
    }
    if (input.mode !== "add" && input.mode !== "replace") throw new Error("Choose add or replace.");
    if (!Array.isArray(input.rows)) throw new Error("No rows to import.");
    if (input.rows.length > 2000) throw new Error("Import is limited to 2,000 rows.");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    if (data.kind === "clients") return importClientRows(sql, context.userId, data.rows, data.mode);
    if (data.kind === "team") return importTeamRows(sql, context.userId, data.rows, data.mode);
    return importScheduleRows(sql, context.userId, data.rows, data.mode);
  });
