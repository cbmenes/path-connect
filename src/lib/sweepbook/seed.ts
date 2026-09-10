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
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_ID,
  DEMO_ADMIN_PASSWORD,
  DEMO_REQUEST_ID,
} from "./types";
import { addressPartsFrom, ensureBookingSlug, namesFrom, storePhone } from "./people";
import { addDaysChicago, chicagoDate, chicagoDateInputValue, nid, nextWeekdayOnOrAfter, partsInChicago, startOfChicagoDay } from "./time";

const g = globalThis as typeof globalThis & { __sweepbookSeed13__?: Promise<void> };

export async function ensureDemoSeed(sql: Sql) {
  if (!g.__sweepbookSeed13__) {
    g.__sweepbookSeed13__ = seedIfNeeded(sql).catch((err) => {
      g.__sweepbookSeed13__ = undefined;
      throw err;
    });
  }
  await g.__sweepbookSeed13__;
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
  await seedV6(sql);
  await seedV7(sql);
  await seedV8(sql);
  await seedV9(sql);
}

/** Create or repair the three public demo logins (email + password). */
async function ensureDemoAccounts(sql: Sql) {
  await insertUser(sql, DEMO_CLEANER_ID, "Maya Brooks", DEMO_CLEANER_EMAIL, DEMO_CLEANER_PASSWORD);
  await insertUser(sql, DEMO_CLIENT_USER_ID, "Cam Delgado", DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD);
  await insertUser(sql, DEMO_TEAM_ID, "Lena Ruiz", DEMO_TEAM_EMAIL, DEMO_TEAM_PASSWORD);
  await insertUser(sql, DEMO_ADMIN_ID, "Renee Cole", DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);

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
      can_message, team_status, pay_type, pay_amount, pay_note
    ) values (
      ${DEMO_TEAM_ID}, ${"cleaner"}, ${"Lena Ruiz"}, ${"(405) 555-0160"},
      ${DEMO_TEAM_EMAIL}, ${"team"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"},
      ${"hourly"}, ${2500}, ${"Demo: $25/hr"}
    )
    on conflict (user_id) do nothing
  `;
  await sql`
    update profiles
    set pay_type = ${"hourly"}, pay_amount = ${2500}, pay_note = ${"Demo: $25/hr"}
    where user_id = ${DEMO_TEAM_ID}
      and coalesce(pay_type, 'none') = 'none'
      and coalesce(pay_amount, 0) = 0
      and pay_note is null
  `;
  await sql`
    insert into profiles (
      user_id, role, full_name, phone, email, cleaner_kind, master_user_id,
      can_message, team_status, can_charge
    ) values (
      ${DEMO_ADMIN_ID}, ${"cleaner"}, ${"Renee Cole"}, ${"(405) 555-0168"},
      ${DEMO_ADMIN_EMAIL}, ${"admin"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"}, ${false}
    )
    on conflict (user_id) do update set
      cleaner_kind = 'admin',
      master_user_id = ${DEMO_CLEANER_ID},
      email = ${DEMO_ADMIN_EMAIL},
      can_charge = coalesce(profiles.can_charge, false)
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

  for (const c of clients) {
    const [hh, mm] = c.time.split(":").map(Number);
    const first = nextWeekdayOnOrAfter(now, c.day, hh, mm);
    const seriesId = nid("series");
    const step = c.frequency === "weekly" ? 7 : c.frequency === "biweekly" ? 14 : 28;
    const count = c.frequency === "monthly" ? 12 : 26;
    const notBefore = startOfChicagoDay(now).getTime();

    for (let i = 0; i < count; i++) {
      const day = addDaysChicago(first, i * step);
      const p = partsInChicago(day);
      const startAt = chicagoDate(p.year, p.month, p.day, hh, mm);
      if (startAt.getTime() < notBefore) continue;

      const jobId = `${c.id}-job-${i}`;
      await sql`
        insert into jobs (
          id, cleaner_user_id, client_id, service, address, start_at, duration_min,
          price_cents, notes, status, recurrence, series_id
        ) values (
          ${jobId}, ${DEMO_CLEANER_ID}, ${c.id}, ${"House cleaning"}, ${c.address},
          ${startAt.toISOString()}, ${c.duration}, ${c.price}, ${c.notes}, ${"scheduled"},
          ${c.frequency}, ${seriesId}
        )
      `;
    }
  }

  await ensureDemoOneOffHistory(sql);

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
        can_message, team_status, pay_type, pay_amount, pay_note
      ) values (
        ${DEMO_TEAM_ID}, ${"cleaner"}, ${"Lena Ruiz"}, ${"(405) 555-0160"},
        ${DEMO_TEAM_EMAIL}, ${"team"}, ${DEMO_CLEANER_ID}, ${true}, ${"active"},
        ${"hourly"}, ${2500}, ${"Demo: $25/hr"}
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

  const openUnpaid = await sql<{ id: string }>`
    select id from invoices
    where cleaner_user_id = ${DEMO_CLEANER_ID}
      and kind = 'visit'
      and status in ('unpaid', 'failed')
    limit 1
  `;
  if (!openUnpaid.length) {
    const lastPriya = await sql<{ id: string }>`
      select id from invoices
      where cleaner_user_id = ${DEMO_CLEANER_ID}
        and client_id = ${"client-nair"}
        and kind = 'visit'
      order by created_at desc
      limit 1
    `;
    if (lastPriya[0]) {
      await sql`
        update invoices
        set status = 'failed',
            failure_reason = 'Card declined — issuer did not authorize.',
            method = 'card',
            paid_at = null,
            receipt_number = null
        where id = ${lastPriya[0].id}
      `;
    }
  }
}

async function seedV6(sql: Sql) {
  const adminClient = await sql<{ id: string }>`
    select id from messages where channel = 'admin_client' limit 1
  `;
  if (!adminClient.length) {
    const t1 = new Date(Date.now() - 90 * 60_000).toISOString();
    const t2 = new Date(Date.now() - 40 * 60_000).toISOString();
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body, created_at, read_at,
        channel, team_user_id, admin_user_id, sender_user_id, sender_name
      ) values
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${CAM_CLIENT_ID}, ${"cleaner"},
         ${"Cam — Renee here from the office. Confirming Tuesday still works."}, ${t1}, ${t1},
         ${"admin_client"}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${"Renee Cole"}),
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${CAM_CLIENT_ID}, ${"client"},
         ${"Yes, Tuesday is good. Thanks Renee."}, ${t2}, ${null},
         ${"admin_client"}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${DEMO_CLIENT_USER_ID}, ${"Cam Delgado"})
    `;
  }

  const masterAdmin = await sql<{ id: string }>`
    select id from messages where channel = 'master_admin' limit 1
  `;
  if (!masterAdmin.length) {
    const t1 = new Date(Date.now() - 3 * 3600_000).toISOString();
    const t2 = new Date(Date.now() - 2.5 * 3600_000).toISOString();
    await sql`
      insert into messages (
        id, cleaner_user_id, client_id, sender_role, body, created_at, read_at,
        channel, team_user_id, admin_user_id, sender_user_id, sender_name
      ) values
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${null}, ${"cleaner"},
         ${"Renee, can you confirm Cam's Tuesday window before I leave the shop?"}, ${t1}, ${t1},
         ${"master_admin"}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${DEMO_CLEANER_ID}, ${"Maya Brooks"}),
        (${nid("msg")}, ${DEMO_CLEANER_ID}, ${null}, ${"cleaner"},
         ${"Already texted him. He is set for 10."}, ${t2}, ${null},
         ${"master_admin"}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${DEMO_ADMIN_ID}, ${"Renee Cole"})
    `;
  }
}

async function seedOneOff(
  sql: Sql,
  job: {
    id: string;
    clientId: string;
    address: string;
    startAt: Date;
    duration: number;
    price: number;
    notes: string;
    status: "completed" | "cancelled";
    assignees?: string[];
  },
) {
  const existing = await sql<{ id: string }>`select id from jobs where id = ${job.id} limit 1`;
  if (existing.length) return;
  await sql`
    insert into jobs (
      id, cleaner_user_id, client_id, service, address, start_at, duration_min,
      price_cents, notes, status, recurrence, series_id
    ) values (
      ${job.id}, ${DEMO_CLEANER_ID}, ${job.clientId}, ${"House cleaning"}, ${job.address},
      ${job.startAt.toISOString()}, ${job.duration}, ${job.price}, ${job.notes}, ${job.status},
      ${"none"}, ${null}
    )
  `;
  for (const uid of job.assignees ?? []) {
    await sql`
      insert into job_assignees (job_id, user_id) values (${job.id}, ${uid})
      on conflict do nothing
    `;
  }
  if (job.assignees?.[0]) {
    await sql`update jobs set assigned_to_user_id = ${job.assignees[0]} where id = ${job.id}`;
  }
}

async function ensureInvoice(
  sql: Sql,
  input: {
    id: string;
    clientId: string;
    jobId: string;
    amount: number;
    description: string;
    status: "paid" | "unpaid" | "failed";
    kind: "visit" | "tip";
    paidAt?: string | null;
    receipt?: string | null;
    failure?: string | null;
  },
) {
  const existing = await sql<{ id: string }>`select id from invoices where id = ${input.id} limit 1`;
  if (existing.length) return;
  await sql`
    insert into invoices (
      id, cleaner_user_id, client_id, job_id, amount_cents, description,
      status, method, kind, paid_at, receipt_number, failure_reason
    ) values (
      ${input.id}, ${DEMO_CLEANER_ID}, ${input.clientId}, ${input.jobId}, ${input.amount},
      ${input.description}, ${input.status},
      ${input.status === "unpaid" ? null : "card"}, ${input.kind},
      ${input.paidAt ?? null}, ${input.receipt ?? null}, ${input.failure ?? null}
    )
  `;
}

/** Real past one-offs for payments / tips / team pay — not a backfilled series. */
async function ensureDemoOneOffHistory(sql: Sql) {
  const now = new Date();
  const dayAt = (daysAgo: number, hour: number, minute: number) => {
    const d = addDaysChicago(now, -daysAgo);
    const p = partsInChicago(d);
    return chicagoDate(p.year, p.month, p.day, hour, minute);
  };
  const camAt = dayAt(18, 11, 0);
  const priyaAt = dayAt(4, 8, 0);
  const tipAt = dayAt(10, 11, 0);
  const harperAt = dayAt(3, 9, 0);

  await seedOneOff(sql, {
    id: "demo-oneoff-cam-unpaid",
    clientId: CAM_CLIENT_ID,
    address: "200 E Reno Avenue, Apt 612, Oklahoma City, OK 73104",
    startAt: camAt,
    duration: 120,
    price: 14000,
    notes: "Bricktown loft. Please water the fig if the soil is dry.",
    status: "completed",
  });
  await seedOneOff(sql, {
    id: "demo-oneoff-cam-tip",
    clientId: CAM_CLIENT_ID,
    address: "200 E Reno Avenue, Apt 612, Oklahoma City, OK 73104",
    startAt: tipAt,
    duration: 120,
    price: 14000,
    notes: "Bricktown loft. Please water the fig if the soil is dry.",
    status: "completed",
  });
  await seedOneOff(sql, {
    id: "demo-oneoff-nair-failed",
    clientId: "client-nair",
    address: "1335 N Hudson Avenue, Oklahoma City, OK 73103",
    startAt: priyaAt,
    duration: 180,
    price: 18000,
    notes: "Plaza District loft. Windows monthly.",
    status: "completed",
  });
  await seedOneOff(sql, {
    id: "demo-oneoff-harper-pay",
    clientId: "client-harpers",
    address: "1421 Drury Lane, Nichols Hills, OK 73116",
    startAt: harperAt,
    duration: 150,
    price: 17500,
    notes: "Two stories, extra bathrooms upstairs.",
    status: "completed",
    assignees: [DEMO_TEAM_ID, DEMO_TEAM2_ID],
  });

  await ensureInvoice(sql, {
    id: "demo-inv-cam-unpaid",
    clientId: CAM_CLIENT_ID,
    jobId: "demo-oneoff-cam-unpaid",
    amount: 14000,
    description: "House cleaning — Cam Delgado",
    status: "unpaid",
    kind: "visit",
  });
  await ensureInvoice(sql, {
    id: "demo-inv-nair-failed",
    clientId: "client-nair",
    jobId: "demo-oneoff-nair-failed",
    amount: 18000,
    description: "House cleaning — Priya Nair",
    status: "failed",
    kind: "visit",
    failure: "Card declined — issuer did not authorize.",
  });
  await ensureInvoice(sql, {
    id: "demo-inv-cam-tip",
    clientId: CAM_CLIENT_ID,
    jobId: "demo-oneoff-cam-tip",
    amount: 2000,
    description: "Tip — Cam Delgado",
    status: "paid",
    kind: "tip",
    paidAt: new Date().toISOString(),
    receipt: "SB-TIP20",
  });
  await sql`update jobs set tip_cents = greatest(tip_cents, 2000) where id = ${"demo-oneoff-cam-tip"}`;
  await ensureInvoice(sql, {
    id: "demo-inv-cam-tip-visit",
    clientId: CAM_CLIENT_ID,
    jobId: "demo-oneoff-cam-tip",
    amount: 14000,
    description: "House cleaning — Cam Delgado",
    status: "paid",
    kind: "visit",
    paidAt: tipAt.toISOString(),
    receipt: "SB-TIPVISIT",
  });
  await ensureInvoice(sql, {
    id: "demo-inv-harper-paid",
    clientId: "client-harpers",
    jobId: "demo-oneoff-harper-pay",
    amount: 17500,
    description: "House cleaning — The Harpers",
    status: "paid",
    kind: "visit",
    paidAt: harperAt.toISOString(),
    receipt: "SB-1880",
  });
}

async function seedV7(sql: Sql) {
  const cutoff = startOfChicagoDay(new Date()).toISOString();
  const phantoms = await sql<{ id: string }>`
    select id from jobs
    where cleaner_user_id = ${DEMO_CLEANER_ID}
      and id like ${"client-%-job-%"}
      and start_at < ${cutoff}::timestamptz
  `;
  for (const row of phantoms) {
    await sql`delete from job_assignees where job_id = ${row.id}`;
    await sql`delete from invoices where job_id = ${row.id}`;
    await sql`delete from notifications where job_id = ${row.id}`;
    await sql`delete from reminder_sends where job_id = ${row.id}`;
    await sql`delete from jobs where id = ${row.id}`;
  }
  await ensureDemoOneOffHistory(sql);
}

async function seedV8(sql: Sql) {
  const existing = await sql<{ id: string }>`
    select id from clean_requests where id = ${DEMO_REQUEST_ID} limit 1
  `;
  if (existing.length) return;
  const preferred = chicagoDateInputValue(addDaysChicago(new Date(), 3));
  await sql`
    insert into clean_requests (
      id, cleaner_user_id, name, phone, email, address, service_type,
      preferred_date, preferred_time, notes, status
    ) values (
      ${DEMO_REQUEST_ID}, ${DEMO_CLEANER_ID}, ${"Riley Quinn"}, ${"(405) 555-0142"},
      ${"riley.quinn@example.com"}, ${"904 NW 23rd Street, Oklahoma City, OK 73103"},
      ${"weekly"}, ${preferred}, ${"10:00"},
      ${"Two dogs. Please text on the way. Prefer after 10 if the morning runs long."},
      ${"pending"}
    )
  `;
  const already = await sql<{ id: string }>`
    select id from notifications
    where request_id = ${DEMO_REQUEST_ID} and kind = ${"clean_request"}
    limit 1
  `;
  if (already.length) return;
  await sql`
    insert into notifications (
      id, user_id, kind, title, body, request_id, client_name, status
    ) values (
      ${nid("ntf")}, ${DEMO_CLEANER_ID}, ${"clean_request"},
      ${"New clean request from Riley Quinn"},
      ${"Weekly · " + preferred + " 10:00"},
      ${DEMO_REQUEST_ID}, ${"Riley Quinn"}, ${"unread"}
    )
  `;
  await sql`
    insert into notifications (
      id, user_id, kind, title, body, request_id, client_name, status
    ) values (
      ${nid("ntf")}, ${DEMO_ADMIN_ID}, ${"clean_request"},
      ${"New clean request from Riley Quinn"},
      ${"Weekly · " + preferred + " 10:00"},
      ${DEMO_REQUEST_ID}, ${"Riley Quinn"}, ${"unread"}
    )
  `;
}

async function seedV9(sql: Sql) {
  await sql`
    update profiles
    set booking_slug = ${"brooks-clean-co"}
    where user_id = ${DEMO_CLEANER_ID}
      and (booking_slug is null or booking_slug <> ${"brooks-clean-co"})
  `;

  const profiles = await sql<{
    user_id: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    address: string | null;
    address_line1: string | null;
    business_name: string | null;
    cleaner_kind: string | null;
    booking_slug: string | null;
  }>`
    select user_id, full_name, first_name, last_name, phone, address, address_line1,
           business_name, cleaner_kind, booking_slug
    from profiles
  `;
  for (const p of profiles) {
    const names = namesFrom(p.first_name, p.last_name, p.full_name);
    const parts = addressPartsFrom(p);
    await sql`
      update profiles set
        first_name = ${names.first_name || null},
        last_name = ${names.last_name || null},
        phone = ${storePhone(p.phone)},
        address = ${p.address},
        address_line1 = ${parts.address_line1 || p.address_line1},
        address_line2 = ${parts.address_line2 || null},
        city = ${parts.city || null},
        state = ${parts.state || null},
        zip = ${parts.zip || null}
      where user_id = ${p.user_id}
    `;
    if ((p.cleaner_kind === "master" || !p.cleaner_kind) && !p.booking_slug && p.user_id !== DEMO_CLEANER_ID) {
      await ensureBookingSlug(sql, p.user_id, p.business_name || p.full_name);
    }
  }

  const clients = await sql<{
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    address: string | null;
    address_line1: string | null;
  }>`
    select id, name, first_name, last_name, phone, address, address_line1 from clients
  `;
  for (const c of clients) {
    const names = namesFrom(c.first_name, c.last_name, c.name);
    const parts = addressPartsFrom(c);
    let bedrooms: number | null = null;
    let bathrooms: number | null = null;
    let sqft: number | null = null;
    if (c.id === CAM_CLIENT_ID) {
      bedrooms = 1;
      bathrooms = 1;
      sqft = 900;
    } else if (c.id === "client-harpers") {
      bedrooms = 4;
      bathrooms = 3;
      sqft = 2800;
    }
    await sql`
      update clients set
        first_name = ${names.first_name || null},
        last_name = ${names.last_name || null},
        phone = ${storePhone(c.phone)},
        address_line1 = ${parts.address_line1 || null},
        address_line2 = ${parts.address_line2 || null},
        city = ${parts.city || null},
        state = ${parts.state || null},
        zip = ${parts.zip || null},
        bedrooms = coalesce(bedrooms, ${bedrooms}),
        bathrooms = coalesce(bathrooms, ${bathrooms}),
        square_footage = coalesce(square_footage, ${sqft})
      where id = ${c.id}
    `;
    await sql`
      update jobs set
        address_line1 = coalesce(nullif(address_line1, ''), ${parts.address_line1 || null}),
        address_line2 = coalesce(nullif(address_line2, ''), ${parts.address_line2 || null}),
        city = coalesce(nullif(city, ''), ${parts.city || null}),
        state = coalesce(nullif(state, ''), ${parts.state || null}),
        zip = coalesce(nullif(zip, ''), ${parts.zip || null})
      where client_id = ${c.id} and coalesce(address_line1, '') = ''
    `;
  }

  const reqs = await sql<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    first_name: string | null;
  }>`
    select id, name, phone, address, first_name from clean_requests
  `;
  for (const r of reqs) {
    const names = namesFrom(r.first_name, null, r.name);
    const parts = addressPartsFrom(r);
    await sql`
      update clean_requests set
        first_name = ${names.first_name || null},
        last_name = ${names.last_name || null},
        phone = ${storePhone(r.phone)},
        address_line1 = ${parts.address_line1 || null},
        address_line2 = ${parts.address_line2 || null},
        city = ${parts.city || null},
        state = ${parts.state || null},
        zip = ${parts.zip || null}
      where id = ${r.id}
    `;
  }

  await sql`
    update notifications
    set title = replace(title, 'New clean request from', 'New booking request from')
    where kind = ${"clean_request"} and title like 'New clean request from%'
  `;
}



