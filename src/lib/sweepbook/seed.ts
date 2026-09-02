import { hashPassword } from "better-auth/crypto";
import type { Sql } from "@/lib/db";
import {
  CAM_CLIENT_ID,
  DEMO_CLEANER_EMAIL,
  DEMO_CLEANER_ID,
  DEMO_CLEANER_PASSWORD,
  DEMO_CLIENT_EMAIL,
  DEMO_CLIENT_PASSWORD,
  DEMO_CLIENT_USER_ID,
  DEMO_TEAM_EMAIL,
  DEMO_TEAM_ID,
  DEMO_TEAM_PASSWORD,
  DEMO_TEAM2_EMAIL,
  DEMO_TEAM2_ID,
  DEMO_TEAM2_PASSWORD,
} from "./types";
import { addDaysChicago, chicagoDate, nid, nextWeekdayOnOrAfter, partsInChicago } from "./time";

const g = globalThis as typeof globalThis & { __sweepbookSeed6__?: Promise<void> };

export async function ensureDemoSeed(sql: Sql) {
  if (!g.__sweepbookSeed6__) {
    g.__sweepbookSeed6__ = seedIfNeeded(sql).catch((err) => {
      g.__sweepbookSeed6__ = undefined;
      throw err;
    });
  }
  await g.__sweepbookSeed6__;
}

async function seedIfNeeded(sql: Sql) {
  await ensureDemoAccounts(sql);
  const existing = await sql<{ x: number }>`
    select 1 as x from clients where id = ${CAM_CLIENT_ID} limit 1
  `;
  if (!existing.length) {
    await seedAll(sql);
  }
  await seedV2(sql);
  await seedV3(sql);
  await seedV4(sql);
  await seedV5(sql);
}

/** Create or repair the three public demo logins (email + password). */
async function ensureDemoAccounts(sql: Sql) {
  await insertUser(sql, DEMO_CLEANER_ID, "Maya Brooks", DEMO_CLEANER_EMAIL, DEMO_CLEANER_PASSWORD);
  await insertUser(sql, DEMO_CLIENT_USER_ID, "Cam Delgado", DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD);
  await insertUser(sql, DEMO_TEAM_ID, "Lena Ruiz", DEMO_TEAM_EMAIL, DEMO_TEAM_PASSWORD);

  await sql`
    insert into profiles (
      user_id, role, full_name, business_name, phone, cancellation_policy,
      default_duration_min, default_rate_cents, cleaner_kind, email, plan_status, plan_price_cents
    ) values (
      ${DEMO_CLEANER_ID}, ${"cleaner"}, ${"Maya Brooks"}, ${"Brooks Clean Co."},
      ${"(405) 555-0148"},
      ${"Cancellations made less than 24 hours before a visit may be charged half the scheduled rate. Weather delays are never charged."},
      ${120}, ${15000}, ${"master"}, ${DEMO_CLEANER_EMAIL}, ${"active"}, ${1900}
    )
    on conflict (user_id) do nothing
  `;
  await sql`
    insert into profiles (user_id, role, full_name, phone)
    values (${DEMO_CLIENT_USER_ID}, ${"client"}, ${"Cam Delgado"}, ${"(405) 555-0194"})
    on conflict (user_id) do nothing
  `;
  await sql`
    insert into profiles (
      user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
      can_message, team_status
    ) values (
      ${DEMO_TEAM_ID}, ${"cleaner"}, ${"Lena Ruiz"}, ${"(405) 555-0160"},
      ${DEMO_TEAM_EMAIL}, ${"team"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"}
    )
    on conflict (user_id) do nothing
  `;
}

async function insertUser(
  sql: Sql,
  id: string,
  name: string,
  email: string,
  password: string,
) {
  const now = new Date().toISOString();
  const hash = await hashPassword(password);
  const byEmail = await sql<{ id: string }>`
    select id from "user" where email = ${email} limit 1
  `;
  const userId = byEmail[0]?.id ?? id;
  if (!byEmail.length) {
    await sql`
      insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
      values (${userId}, ${name}, ${email}, ${true}, ${null}, ${now}, ${now})
    `;
  } else {
    await sql`
      update "user"
      set name = ${name}, "emailVerified" = ${true}, "updatedAt" = ${now}
      where id = ${userId}
    `;
  }
  const acc = await sql<{ id: string }>`
    select id from "account"
    where "userId" = ${userId} and "providerId" = ${"credential"}
    limit 1
  `;
  if (acc[0]) {
    await sql`
      update "account"
      set password = ${hash}, "accountId" = ${userId}, "updatedAt" = ${now}
      where id = ${acc[0].id}
    `;
  } else {
    await sql`
      insert into "account" (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      ) values (
        ${nid("acc")}, ${userId}, ${"credential"}, ${userId}, ${hash}, ${now}, ${now}
      )
    `;
  }
}

type SeedClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  access: string;
  pets: string;
  supplies: string;
  price: number;
  duration: number;
  day: string;
  time: string;
  frequency: "weekly" | "biweekly" | "monthly";
  notes: string;
  linked?: string;
};

async function seedAll(sql: Sql) {
  await insertUser(sql, DEMO_CLEANER_ID, "Maya Brooks", DEMO_CLEANER_EMAIL, DEMO_CLEANER_PASSWORD);
  await insertUser(sql, DEMO_CLIENT_USER_ID, "Cam Delgado", DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD);

  const policy =
    "Cancellations made less than 24 hours before a visit may be charged half the scheduled rate. Weather delays are never charged.";

  await sql`
    insert into profiles (
      user_id, role, full_name, business_name, phone, cancellation_policy,
      default_duration_min, default_rate_cents, cleaner_kind, email, plan_status, plan_price_cents
    ) values (
      ${DEMO_CLEANER_ID}, ${"cleaner"}, ${"Maya Brooks"}, ${"Brooks Clean Co."},
      ${"(405) 555-0148"}, ${policy}, ${120}, ${15000}, ${"master"},
      ${DEMO_CLEANER_EMAIL}, ${"active"}, ${1900}
    )
    on conflict (user_id) do nothing
  `;
  await sql`
    insert into profiles (user_id, role, full_name, phone)
    values (${DEMO_CLIENT_USER_ID}, ${"client"}, ${"Cam Delgado"}, ${"(405) 555-0194"})
    on conflict (user_id) do nothing
  `;

  const clients: SeedClient[] = [
    {
      id: "client-harpers",
      name: "The Harpers",
      phone: "(405) 555-0112",
      email: "ellen.harper@example.com",
      address: "1421 Drury Lane, Nichols Hills, OK 73116",
      access: "Key under the mat. Alarm code 3319 — disarm, then rearm on the way out.",
      pets: "Scout, golden retriever. Friendly. Keep the back gate latched.",
      supplies: "Vacuum in the hall closet. They prefer unscented products.",
      price: 17500,
      duration: 150,
      day: "tuesday",
      time: "09:00",
      frequency: "weekly",
      notes: "Two stories, extra bathrooms upstairs.",
    },
    {
      id: "client-ellis",
      name: "Jordan Ellis",
      phone: "(405) 555-0177",
      email: "jordan.ellis@example.com",
      address: "817 NW 16th Street, Oklahoma City, OK 73103",
      access: "Door code 4821. Please close the door fully so the cats stay in.",
      pets: "Two indoor cats, Miso and Bean.",
      supplies: "Supplies under the kitchen sink. Extra microfiber cloths in the pantry.",
      price: 16000,
      duration: 120,
      day: "thursday",
      time: "13:00",
      frequency: "biweekly",
      notes: "Midtown bungalow. Shoes off at the door.",
    },
    {
      id: "client-okonkwos",
      name: "The Okonkwos",
      phone: "(405) 555-0164",
      email: "ada.okonkwo@example.com",
      address: "2204 Winding Creek Road, Edmond, OK 73013",
      access: "Garage keypad 1904. House entrance is through the mudroom.",
      pets: "None.",
      supplies: "All supplies in the laundry closet. Please restock paper towels from the garage shelf.",
      price: 21000,
      duration: 180,
      day: "friday",
      time: "10:00",
      frequency: "weekly",
      notes: "Large kitchen — they cook a lot on Thursdays.",
    },
    {
      id: "client-nair",
      name: "Priya Nair",
      phone: "(405) 555-0133",
      email: "priya.nair@example.com",
      address: "1335 N Hudson Avenue, Oklahoma City, OK 73103",
      access: "Buzz 4B. Elevator to four, left at the landing.",
      pets: "None.",
      supplies: "She provides everything. Do not use bleach — serious allergy.",
      price: 18000,
      duration: 180,
      day: "saturday",
      time: "08:00",
      frequency: "monthly",
      notes: "Plaza District loft. Windows monthly.",
    },
    {
      id: "client-whitakers",
      name: "The Whitakers",
      phone: "(405) 555-0188",
      email: "sam.whitaker@example.com",
      address: "401 Ranchwood Drive, Yukon, OK 73099",
      access: "Back door unlocked. Please knock first — baby may be napping 1–3pm.",
      pets: "Rescue mutt, Pepper. Crate in the laundry if she's underfoot.",
      supplies: "Use their vacuum only. Extra linens in the hall chest.",
      price: 15000,
      duration: 120,
      day: "monday",
      time: "14:00",
      frequency: "weekly",
      notes: "Quiet visit while the baby sleeps.",
    },
    {
      id: CAM_CLIENT_ID,
      name: "Cam Delgado",
      phone: "(405) 555-0194",
      email: DEMO_CLIENT_EMAIL,
      address: "200 E Reno Avenue, Apt 612, Oklahoma City, OK 73104",
      access: "Park in garage P2. Elevator to 6. Spare key with the front desk if locked out.",
      pets: "None.",
      supplies: "Bring all supplies. Small loft — 900 sq ft.",
      price: 14000,
      duration: 120,
      day: "wednesday",
      time: "11:00",
      frequency: "biweekly",
      notes: "Bricktown loft. Please water the fig if the soil is dry.",
      linked: DEMO_CLIENT_USER_ID,
    },
  ];

  for (const c of clients) {
    await sql`
      insert into clients (
        id, cleaner_user_id, linked_user_id, name, phone, email, address,
        access_notes, pets, supplies, default_price_cents, default_duration_min,
        usual_day, usual_time, frequency, notes
      ) values (
        ${c.id}, ${DEMO_CLEANER_ID}, ${c.linked ?? null}, ${c.name}, ${c.phone},
        ${c.email}, ${c.address}, ${c.access}, ${c.pets}, ${c.supplies},
        ${c.price}, ${c.duration}, ${c.day}, ${c.time}, ${c.frequency}, ${c.notes}
      )
    `;
  }

  const now = new Date();
  const origin = addDaysChicago(now, -56);

  for (const c of clients) {
    const [hh, mm] = c.time.split(":").map(Number);
    const first = nextWeekdayOnOrAfter(origin, c.day, hh, mm);
    const seriesId = nid("series");
    const step = c.frequency === "weekly" ? 7 : c.frequency === "biweekly" ? 14 : 28;
    const count = c.frequency === "monthly" ? 8 : c.frequency === "biweekly" ? 12 : 20;

    for (let i = 0; i < count; i++) {
      const start = new Date(first.getTime() + i * step * 24 * 60 * 60 * 1000);
      // Re-resolve through Chicago so DST doesn't drift the wall clock.
      const p = partsInChicago(start);
      const startAt = chicagoDate(p.year, p.month, p.day, hh, mm);
      const isPast = startAt.getTime() + c.duration * 60_000 < now.getTime();
      const isTodayish = Math.abs(startAt.getTime() - now.getTime()) < 12 * 60 * 60 * 1000;
      let status: "scheduled" | "completed" | "cancelled" = isPast ? "completed" : "scheduled";
      // A couple of cancelled historical visits for realism
      if (c.id === "client-ellis" && i === 2) status = "cancelled";

      const jobId = `${c.id}-job-${i}`;
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address, start_at, duration_min,
          price_cents, notes, status, recurrence, series_id
        ) values (
          ${jobId}, ${DEMO_CLEANER_ID}, ${c.id}, ${"House cleaning"}, ${c.address},
          ${startAt.toISOString()}, ${c.duration}, ${c.price}, ${c.notes}, ${status},
          ${c.frequency}, ${seriesId}
        )
      `;

      if (status === "completed") {
        const paid = !(
          (c.id === "client-nair" && isPast && i === count - 5) ||
          (c.id === CAM_CLIENT_ID && isPast && !isTodayish && i === Math.max(0, count - 6))
        );
        // Mark two specific unpaid invoices instead of heuristic — handled below.
        await sql`
          insert into invoices (
            id, cleaner_user_id, client_id, job_id, amount_cents, description,
            status, method, kind, paid_at, receipt_number
          ) values (
            ${nid("inv")}, ${DEMO_CLEANER_ID}, ${c.id}, ${jobId}, ${c.price},
            ${`House cleaning — ${c.name}`}, ${paid ? "paid" : "unpaid"},
            ${"card"}, ${"visit"}, ${paid ? startAt.toISOString() : null},
            ${paid ? `SB-${1000 + i}` : null}
          )
        `;
      }
    }
  }

  // Two unpaid invoices: Priya's last completed visit, Cam's last completed visit.
  const unpaidTargets = await sql<{ id: string; client_id: string; price_cents: number; start_at: string }>`
    select j.id, j.client_id, j.price_cents, j.start_at::text as start_at
    from jobs j
    where j.cleaner_user_id = ${DEMO_CLEANER_ID}
      and j.status = 'completed'
      and j.client_id in (${"client-nair"}, ${CAM_CLIENT_ID})
    order by j.start_at desc
  `;
  const seen = new Set<string>();
  for (const row of unpaidTargets) {
    if (seen.has(row.client_id)) continue;
    seen.add(row.client_id);
    await sql`
      update invoices
      set status = 'unpaid', method = null, paid_at = null, receipt_number = null
      where job_id = ${row.id}
    `;
  }

  // Failed payment alert on Priya so the cleaner sees it.
  const priyaFailed = await sql<{ id: string }>`
    select id from invoices
    where client_id = ${"client-nair"} and status = 'unpaid'
    order by created_at desc limit 1
  `;
  if (priyaFailed[0]) {
    await sql`
      update invoices
      set status = 'failed', failure_reason = 'Card declined — issuer did not authorize.',
          method = 'card'
      where id = ${priyaFailed[0].id}
    `;
  }

  // Cards on file
  await sql`
    insert into payment_cards (
      id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
      holder_name, source, is_default, failing
    ) values
      (${nid("card")}, ${DEMO_CLEANER_ID}, ${CAM_CLIENT_ID}, ${"visa"}, ${"4242"},
       ${12}, ${2028}, ${"Cam Delgado"}, ${"client"}, ${true}, ${false}),
      (${nid("card")}, ${DEMO_CLEANER_ID}, ${"client-harpers"}, ${"mastercard"}, ${"4444"},
       ${4}, ${2027}, ${"Ellen Harper"}, ${"client"}, ${true}, ${false}),
      (${nid("card")}, ${DEMO_CLEANER_ID}, ${"client-nair"}, ${"visa"}, ${"0002"},
       ${8}, ${2026}, ${"Priya Nair"}, ${"client"}, ${true}, ${true})
  `;

  const msg = async (clientId: string, role: "cleaner" | "client", body: string, hoursAgo: number, unread = false) => {
    const at = new Date(Date.now() - hoursAgo * 3600_000).toISOString();
    const senderUserId = role === "cleaner" ? DEMO_CLEANER_ID : clientId === CAM_CLIENT_ID ? DEMO_CLIENT_USER_ID : null;
    const senderName = role === "cleaner" ? "Maya Brooks" : clientId === CAM_CLIENT_ID ? "Cam Delgado" : null;
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body, created_at, read_at,
        channel, sender_user_id, sender_name
      ) values (
        ${nid("msg")}, ${DEMO_CLEANER_ID}, ${clientId}, ${role}, ${body}, ${at},
        ${unread ? null : at}, ${"master_client"}, ${senderUserId}, ${senderName}
      )
    `;
  };

  await msg("client-harpers", "client", "Hi Maya — could you add the upstairs hall bath this week? We had guests.", 30);
  await msg("client-harpers", "cleaner", "Of course. I'll plan an extra 20 minutes and keep the rate the same this visit.", 28);
  await msg("client-harpers", "client", "You're the best. Scout will be at daycare so the house should be quiet.", 26, true);

  await msg("client-ellis", "cleaner", "Jordan, I'll be about 10 minutes early on Thursday. The cats still okay with the closet closed?", 10);
  await msg("client-ellis", "client", "Yes — Miso likes the bedroom window. Just please latch the front door; Bean is an escape artist.", 8);
  await msg("client-ellis", "cleaner", "Latched, every time. See you Thursday.", 7, true);

  await msg(CAM_CLIENT_ID, "cleaner", "Cam — garage P2 is tight this week because of the ballgame. I'll text when I'm in the lobby.", 5);
  await msg(CAM_CLIENT_ID, "client", "Park in visitor if you need to. Fig's been thirsty — extra water is appreciated.", 4);
  await msg(CAM_CLIENT_ID, "cleaner", "Will do. See you Wednesday at 11.", 3);

  // Open invite for the Harpers so the flow is clickable
  await sql`
    insert into invites (id, token, cleaner_user_id, client_id, email)
    values (${nid("invt")}, ${"harper-invite-demo"}, ${DEMO_CLEANER_ID}, ${"client-harpers"}, ${"ellen.harper@example.com"})
  `;
  await sql`
    insert into card_links (id, token, cleaner_user_id, client_id)
    values (${nid("clink")}, ${"harper-card-demo"}, ${DEMO_CLEANER_ID}, ${"client-harpers"})
  `;
}

async function seedV2(sql: Sql) {
  await sql`
    update profiles set
      cleaner_kind = coalesce(cleaner_kind, 'master'),
      email = coalesce(email, ${DEMO_CLEANER_EMAIL}),
      plan_status = 'active',
      plan_price_cents = 1900,
      team_messaging_enabled = true
    where user_id = ${DEMO_CLEANER_ID}
  `;

  const teamUser = await sql<{ id: string }>`select id from "user" where email = ${DEMO_TEAM_EMAIL} limit 1`;
  if (!teamUser.length) {
    await insertUser(sql, DEMO_TEAM_ID, "Lena Ruiz", DEMO_TEAM_EMAIL, DEMO_TEAM_PASSWORD);
    await sql`
      insert into profiles (
        user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
        can_message, team_status
      ) values (
        ${DEMO_TEAM_ID}, ${"cleaner"}, ${"Lena Ruiz"}, ${"(405) 555-0160"},
        ${DEMO_TEAM_EMAIL}, ${"team"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"}
      )
      on conflict (user_id) do nothing
    `;
  }

  const assigned = await sql<{ n: number }>`
    select count(*)::int as n from jobs
    where assigned_to_user_id = ${DEMO_TEAM_ID} and status = 'scheduled' and start_at >= now()
  `;
  if (Number(assigned[0]?.n || 0) < 2) {
    for (const clientId of ["client-harpers", "client-okonkwos"]) {
      const already = await sql<{ id: string }>`
        select id from jobs
        where assigned_to_user_id = ${DEMO_TEAM_ID} and client_id = ${clientId}
          and status = 'scheduled' and start_at >= now()
        limit 1
      `;
      if (already.length) continue;
      const upcoming = await sql<{ id: string }>`
        select id from jobs
        where cleaner_user_id = ${DEMO_CLEANER_ID} and client_id = ${clientId}
          and status = 'scheduled' and start_at >= now()
        order by start_at asc limit 1
      `;
      if (upcoming[0]) {
        await sql`update jobs set assigned_to_user_id = ${DEMO_TEAM_ID} where id = ${upcoming[0].id}`;
      }
    }
  }

  const billing = await sql<{ id: string }>`
    select id from billing_methods where user_id = ${DEMO_CLEANER_ID} limit 1
  `;
  if (!billing.length) {
    await sql`
      insert into billing_methods (
        id, user_id, kind, brand, last4, exp_month, exp_year, holder_name, is_default
      ) values (
        ${nid("bill")}, ${DEMO_CLEANER_ID}, ${"card"}, ${"visa"}, ${"4242"},
        ${12}, ${2028}, ${"Maya Brooks"}, ${true}
      )
    `;
  }

  const note = await sql<{ id: string }>`
    select id from notifications where user_id = ${DEMO_CLEANER_ID} limit 1
  `;
  if (!note.length) {
    const future = await sql<{ id: string; start_at: string; client_id: string }>`
      select id, start_at::text as start_at, client_id from jobs
      where cleaner_user_id = ${DEMO_CLEANER_ID} and client_id = ${"client-ellis"}
        and status = 'scheduled' and start_at > now()
      order by start_at asc limit 1
    `;
    const job = future[0];
    if (job) {
      const requested = new Date(new Date(job.start_at).getTime() + 24 * 3600_000).toISOString();
      await sql`
        update jobs set status = 'reschedule_requested',
          reschedule_note = 'Could we move this to tomorrow? I have a work thing.',
          reschedule_requested_at = ${requested}::timestamptz
        where id = ${job.id}
      `;
      await sql`
        insert into notifications (
          id, user_id, kind, title, body, job_id, client_id, client_name, requested_start_at, status
        ) values (
          ${nid("ntf")}, ${DEMO_CLEANER_ID}, ${"reschedule"},
          ${"Jordan Ellis requested a reschedule"},
          ${"Could we move this to tomorrow? I have a work thing."},
          ${job.id}, ${"client-ellis"}, ${"Jordan Ellis"}, ${requested}::timestamptz, ${"unread"}
        )
      `;
    }
  }
}

async function seedV3(sql: Sql) {
  const team2 = await sql<{ id: string }>`select id from "user" where email = ${DEMO_TEAM2_EMAIL} limit 1`;
  if (!team2.length) {
    await insertUser(sql, DEMO_TEAM2_ID, "Noah Patel", DEMO_TEAM2_EMAIL, DEMO_TEAM2_PASSWORD);
    await sql`
      insert into profiles (
        user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
        can_message, team_status
      ) values (
        ${DEMO_TEAM2_ID}, ${"cleaner"}, ${"Noah Patel"}, ${"(405) 555-0162"},
        ${DEMO_TEAM2_EMAIL}, ${"team"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"}
      )
      on conflict (user_id) do nothing
    `;
  }

  for (const uid of [DEMO_TEAM_ID, DEMO_TEAM2_ID]) {
    await sql`
      insert into client_assignees (client_id, user_id)
      values (${"client-harpers"}, ${uid})
      on conflict do nothing
    `;
  }

  const harperJobs = await sql<{ id: string }>`
    select id from jobs
    where cleaner_user_id = ${DEMO_CLEANER_ID}
      and client_id = ${"client-harpers"}
      and status <> 'cancelled'
  `;
  for (const job of harperJobs) {
    for (const uid of [DEMO_TEAM_ID, DEMO_TEAM2_ID]) {
      await sql`
        insert into job_assignees (job_id, user_id)
        values (${job.id}, ${uid})
        on conflict do nothing
      `;
    }
    await sql`
      update jobs set assigned_to_user_id = coalesce(assigned_to_user_id, ${DEMO_TEAM_ID})
      where id = ${job.id}
    `;
  }

  const unreadCam = await sql<{ id: string }>`
    select id from messages
    where client_id = ${CAM_CLIENT_ID} and sender_role = 'cleaner' and read_at is null
    limit 1
  `;
  if (!unreadCam.length) {
    const at = new Date(Date.now() - 2 * 3600_000).toISOString();
    await sql`
      insert into messages (id, cleaner_user_id, client_id, sender_role, body, created_at, read_at, channel, team_user_id, sender_user_id, sender_name)
      values (
        ${nid("msg")}, ${DEMO_CLEANER_ID}, ${CAM_CLIENT_ID}, ${"cleaner"},
        ${"Quick reminder — I'll bring extra glass cleaner this week."}, ${at}, ${null},
        ${"master_client"}, ${null}, ${DEMO_CLEANER_ID}, ${"Maya Brooks"}
      )
    `;
  }
}

async function seedV4(sql: Sql) {
  await sql`
    update messages
    set channel = 'master_client'
    where channel is null or channel = ''
  `;
  await sql`
    update messages
    set sender_user_id = cleaner_user_id, sender_name = coalesce(sender_name, 'Maya Brooks')
    where sender_role = 'cleaner' and sender_user_id is null
  `;
  await sql`
    update messages m
    set sender_user_id = c.linked_user_id, sender_name = coalesce(m.sender_name, c.name)
    from clients c
    where m.sender_role = 'client' and m.client_id = c.id and m.sender_user_id is null
  `;

  const teamThread = await sql<{ id: string }>`
    select id from messages where channel = 'team_client' limit 1
  `;
  if (!teamThread.length) {
    const t1 = new Date(Date.now() - 6 * 3600_000).toISOString();
    const t2 = new Date(Date.now() - 5 * 3600_000).toISOString();
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body, created_at, read_at,
        channel, team_user_id, sender_user_id, sender_name
      ) values
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${"client-harpers"}, ${"cleaner"},
         ${"Ellen — I'll be there at 9. Scout can stay in the yard."}, ${t1}, ${t1},
         ${"team_client"}, ${DEMO_TEAM_ID}, ${DEMO_TEAM_ID}, ${"Lena Ruiz"}),
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${"client-harpers"}, ${"client"},
         ${"Perfect. Extra towels are in the hall closet."}, ${t2}, ${null},
         ${"team_client"}, ${DEMO_TEAM_ID}, ${null}, ${"The Harpers"})
    `;
  }

  const internal = await sql<{ id: string }>`
    select id from messages where channel = 'master_team' limit 1
  `;
  if (!internal.length) {
    const t1 = new Date(Date.now() - 4 * 3600_000).toISOString();
    const t2 = new Date(Date.now() - 3 * 3600_000).toISOString();
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body, created_at, read_at,
        channel, team_user_id, sender_user_id, sender_name
      ) values
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${null}, ${"cleaner"},
         ${"Lena, can you take the Harper Tuesday if I'm running long at Cam's?"}, ${t1}, ${t1},
         ${"master_team"}, ${DEMO_TEAM_ID}, ${DEMO_CLEANER_ID}, ${"Maya Brooks"}),
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${null}, ${"cleaner"},
         ${"Yes — already on my book."}, ${t2}, ${null},
         ${"master_team"}, ${DEMO_TEAM_ID}, ${DEMO_TEAM_ID}, ${"Lena Ruiz"})
    `;
  }

  const cancelNote = await sql<{ id: string }>`
    select id from notifications where kind = 'cancel' and user_id = ${DEMO_CLEANER_ID} limit 1
  `;
  if (!cancelNote.length) {
    const job = await sql<{ id: string; start_at: string; client_id: string }>`
      select id, start_at::text as start_at, client_id from jobs
      where cleaner_user_id = ${DEMO_CLEANER_ID} and client_id = ${CAM_CLIENT_ID}
        and status = 'scheduled' and start_at > now()
      order by start_at asc limit 1
    `;
    if (job[0]) {
      await sql`
        insert into notifications (
          id, user_id, kind, title, body, job_id, client_id, client_name, requested_start_at, status
        ) values (
          ${nid("ntf")}, ${DEMO_CLEANER_ID}, ${"cancel"},
          ${"Cam Delgado cancelled a visit"},
          ${"Client cancelled this appointment."},
          ${job[0].id}, ${CAM_CLIENT_ID}, ${"Cam Delgado"}, ${job[0].start_at}::timestamptz, ${"unread"}
        )
      `;
    }
  }

  const tipNote = await sql<{ id: string }>`
    select id from notifications where kind = 'tip' and user_id = ${DEMO_CLEANER_ID} limit 1
  `;
  if (!tipNote.length) {
    const past = await sql<{ id: string; start_at: string }>`
      select id, start_at::text as start_at from jobs
      where cleaner_user_id = ${DEMO_CLEANER_ID} and client_id = ${CAM_CLIENT_ID}
        and status = 'completed'
      order by start_at desc limit 1
    `;
    if (past[0]) {
      await sql`
        insert into notifications (
          id, user_id, kind, title, body, job_id, client_id, client_name, requested_start_at, status
        ) values (
          ${nid("ntf")}, ${DEMO_CLEANER_ID}, ${"tip"},
          ${"Cam Delgado left a $20.00 tip"},
          ${"Tip on a completed visit."},
          ${past[0].id}, ${CAM_CLIENT_ID}, ${"Cam Delgado"}, ${past[0].start_at}::timestamptz, ${"unread"}
        )
      `;
    }
  }
}

async function seedV5(sql: Sql) {
  const existingTip = await sql<{ id: string }>`
    select id from invoices
    where cleaner_user_id = ${DEMO_CLEANER_ID} and kind = 'tip'
    limit 1
  `;
  if (existingTip.length) return;
  const past = await sql<{ id: string; start_at: string; client_id: string; client_name: string }>`
    select j.id, j.start_at::text as start_at, j.client_id, c.name as client_name
    from jobs j
    join clients c on c.id = j.client_id
    where j.cleaner_user_id = ${DEMO_CLEANER_ID}
      and j.client_id = ${CAM_CLIENT_ID}
      and j.status = 'completed'
    order by j.start_at desc
    limit 1
  `;
  if (!past[0]) return;
  const paidAt = new Date().toISOString();
  await sql`
    insert into invoices (
      id, cleaner_user_id, client_id, job_id, amount_cents, description,
      status, method, kind, paid_at, receipt_number
    ) values (
      ${nid("inv")}, ${DEMO_CLEANER_ID}, ${past[0].client_id}, ${past[0].id}, ${2000},
      ${`Tip — ${past[0].client_name}`}, ${"paid"}, ${"card"}, ${"tip"},
      ${paidAt}, ${"SB-TIP20"}
    )
  `;
  await sql`
    update jobs set tip_cents = greatest(tip_cents, 2000)
    where id = ${past[0].id}
  `;
}


