import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCleaner, getActor } from "./access";
import { MAIL_NOT_CONFIGURED, fromAddress, isMailConfigured, publicAppUrl, sendMail } from "./mail";
import { formatDate, formatHours, formatTime, nid } from "./time";

export const REMINDER_HOST_NOTE =
  "Overnight reminder emails only send while this host is running. Preview and local servers do not run 24/7 — point a cron at /api/reminders on a host that stays up.";

const INTERVAL_MS = 5 * 60 * 1000;
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000 + 30 * 60 * 1000;

type RecipientRole = "client" | "team" | "test";
type SendStatus = "queued" | "sent" | "failed" | "skipped";

type VisitForMail = {
  id: string;
  service: string;
  address: string | null;
  start_at: string;
  duration_min: number;
  status: string;
  client_name: string;
  business_name: string;
};

type ExistingSend = {
  id: string;
  status: SendStatus;
  error: string | null;
};

export type ReminderSendResult = {
  ok: boolean;
  status: SendStatus;
  recipient: string;
  message: string;
  mailConfigured: boolean;
};

type ProcessStats = {
  checked: number;
  sent: number;
  queued: number;
  skipped: number;
  failed: number;
  mailConfigured: boolean;
  fromEmail: string;
  note: string;
};

const globalRef = globalThis as typeof globalThis & {
  __sweepbookReminderTimer__?: ReturnType<typeof setInterval>;
  __sweepbookReminderBoot__?: boolean;
};

function normalizeEmail(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function openSweepbookNote() {
  const base = publicAppUrl();
  if (base) {
    return `Open SweepBook to view this visit:\n${base}/app`;
  }
  return "Open SweepBook and sign in to view this visit on your calendar.";
}

export function reminderEmailCopy(input: {
  role: "client" | "team";
  businessName: string;
  recipientName: string;
  date: string;
  time: string;
  duration: string;
  address: string;
}) {
  const greeting = input.recipientName ? `Hi ${input.recipientName.split(" ")[0]},` : "Hello,";
  const intro =
    input.role === "team"
      ? `This is a reminder from ${input.businessName}. You are assigned to an upcoming cleaning visit.`
      : `This is a reminder from ${input.businessName} about an upcoming cleaning visit.`;
  const text = [
    greeting,
    "",
    intro,
    "",
    `Date: ${input.date}`,
    `Time: ${input.time}`,
    `Duration: ${input.duration}`,
    `Address: ${input.address}`,
    "",
    openSweepbookNote(),
  ].join("\n");
  const subject = `Reminder: visit on ${input.date} at ${input.time}`;
  const html = text
    .split("\n")
    .map((line) => (line ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>` : "<br />"))
    .join("");
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function visitCopy(visit: VisitForMail, role: "client" | "team", recipientName: string) {
  return reminderEmailCopy({
    role,
    businessName: visit.business_name,
    recipientName,
    date: formatDate(visit.start_at, { weekday: "long", month: "long", day: "numeric" }),
    time: formatTime(visit.start_at),
    duration: formatHours(visit.duration_min),
    address: visit.address?.trim() || "Address on file in SweepBook",
  });
}

function sampleVisit(businessName: string): VisitForMail {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    id: "_sample",
    service: "House clean",
    address: "Address on file in SweepBook",
    start_at: start.toISOString(),
    duration_min: 120,
    status: "scheduled",
    client_name: "Sample client",
    business_name: businessName,
  };
}

async function findExisting(
  sql: Sql,
  jobId: string,
  email: string,
  role: RecipientRole,
): Promise<ExistingSend | null> {
  if (role === "test") return null;
  const rows = await sql.query<ExistingSend>(
    `select id, status, error from reminder_sends
     where job_id = $1 and recipient_email = $2 and recipient_role = $3
     order by created_at desc
     limit 1`,
    [jobId, email, role],
  );
  return rows[0] ?? null;
}

async function writeSend(
  sql: Sql,
  input: {
    jobId: string | null;
    cleanerUserId: string | null;
    email: string;
    role: RecipientRole;
    status: SendStatus;
    dueAt: Date | null;
    error: string | null;
    existingId?: string;
  },
) {
  const sentAt = input.status === "sent" ? new Date() : null;
  if (input.existingId) {
    await sql`
      update reminder_sends
      set status = ${input.status},
          sent_at = ${sentAt},
          error = ${input.error},
          due_at = ${input.dueAt}
      where id = ${input.existingId}
    `;
    return input.existingId;
  }
  const id = nid("rmd");
  await sql`
    insert into reminder_sends (
      id, job_id, cleaner_user_id, recipient_email, recipient_role,
      status, due_at, sent_at, error
    ) values (
      ${id}, ${input.jobId}, ${input.cleanerUserId}, ${input.email}, ${input.role},
      ${input.status}, ${input.dueAt}, ${sentAt}, ${input.error}
    )
  `;
  return id;
}

async function deliver(
  sql: Sql,
  input: {
    visit: VisitForMail;
    cleanerUserId: string;
    email: string;
    role: RecipientRole;
    recipientName: string;
    dueAt: Date | null;
    existingId?: string;
  },
): Promise<ReminderSendResult> {
  const configured = isMailConfigured();
  const copy = visitCopy(input.visit, input.role === "team" ? "team" : "client", input.recipientName);

  if (!configured) {
    await writeSend(sql, {
      jobId: input.visit.id,
      cleanerUserId: input.cleanerUserId,
      email: input.email,
      role: input.role,
      status: "queued",
      dueAt: input.dueAt,
      error: MAIL_NOT_CONFIGURED,
      existingId: input.existingId,
    });
    return {
      ok: true,
      status: "queued",
      recipient: input.email,
      message: MAIL_NOT_CONFIGURED,
      mailConfigured: false,
    };
  }

  try {
    await sendMail({ to: input.email, subject: copy.subject, text: copy.text, html: copy.html });
    await writeSend(sql, {
      jobId: input.visit.id,
      cleanerUserId: input.cleanerUserId,
      email: input.email,
      role: input.role,
      status: "sent",
      dueAt: input.dueAt,
      error: null,
      existingId: input.existingId,
    });
    return {
      ok: true,
      status: "sent",
      recipient: input.email,
      message: `Sent to ${input.email}.`,
      mailConfigured: true,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await writeSend(sql, {
      jobId: input.visit.id,
      cleanerUserId: input.cleanerUserId,
      email: input.email,
      role: input.role,
      status: "failed",
      dueAt: input.dueAt,
      error: reason,
      existingId: input.existingId,
    });
    return {
      ok: false,
      status: "failed",
      recipient: input.email,
      message: reason,
      mailConfigured: true,
    };
  }
}

async function skipSend(
  sql: Sql,
  input: {
    jobId: string;
    cleanerUserId: string;
    email: string;
    role: RecipientRole;
    reason: string;
    dueAt: Date | null;
    existingId?: string;
  },
) {
  await writeSend(sql, {
    jobId: input.jobId,
    cleanerUserId: input.cleanerUserId,
    email: input.email,
    role: input.role,
    status: "skipped",
    dueAt: input.dueAt,
    error: input.reason,
    existingId: input.existingId,
  });
}

type DueJob = {
  id: string;
  cleaner_user_id: string;
  service: string;
  address: string | null;
  start_at: string;
  duration_min: number;
  status: string;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  linked_user_id: string | null;
  business_name: string | null;
  master_name: string;
  master_reminders: boolean;
  reminder_email_team: boolean;
};

function asBool(v: unknown, fallback = false) {
  if (v === true || v === "t" || v === "true") return true;
  if (v === false || v === "f" || v === "false") return false;
  return fallback;
}

function toVisit(row: DueJob): VisitForMail {
  return {
    id: row.id,
    service: row.service,
    address: row.address || row.client_address,
    start_at: row.start_at,
    duration_min: Number(row.duration_min),
    status: row.status,
    client_name: row.client_name,
    business_name: row.business_name?.trim() || row.master_name,
  };
}

export async function processDueReminders(): Promise<ProcessStats> {
  const sql = await getSql();
  const stats: ProcessStats = {
    checked: 0,
    sent: 0,
    queued: 0,
    skipped: 0,
    failed: 0,
    mailConfigured: isMailConfigured(),
    fromEmail: fromAddress(),
    note: REMINDER_HOST_NOTE,
  };

  await sql`
    update reminder_sends rs
    set status = ${"skipped"}, error = ${"Visit cancelled"}
    from jobs j
    where rs.job_id = j.id
      and j.status = ${"cancelled"}
      and rs.status = ${"queued"}
      and rs.recipient_role <> ${"test"}
  `;

  const now = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_MS);
  const rows = await sql.query<DueJob>(
    `select j.id, j.cleaner_user_id, j.service, j.address, j.start_at::text as start_at,
            j.duration_min, j.status, c.name as client_name, c.email as client_email,
            c.address as client_address, c.linked_user_id,
            m.business_name, m.full_name as master_name,
            m.email_reminders as master_reminders, m.reminder_email_team
     from jobs j
     join clients c on c.id = j.client_id
     join profiles m on m.user_id = j.cleaner_user_id
     where j.status = 'scheduled'
       and j.start_at > $1::timestamptz
       and j.start_at <= $2::timestamptz
     order by j.start_at asc`,
    [now.toISOString(), until.toISOString()],
  );

  for (const row of rows) {
    stats.checked += 1;
    const visit = toVisit(row);
    const dueAt = new Date(new Date(row.start_at).getTime() - 24 * 60 * 60 * 1000);
    const masterOn = asBool(row.master_reminders, true);
    const teamOn = asBool(row.reminder_email_team, false);

    if (!masterOn) {
      stats.skipped += 1;
      continue;
    }

    let clientOptIn = true;
    let linkedEmail = "";
    if (row.linked_user_id) {
      const linked = await sql.query<{ email: string | null; email_reminders: boolean }>(
        `select email, email_reminders from profiles where user_id = $1 limit 1`,
        [row.linked_user_id],
      );
      if (linked[0]) {
        clientOptIn = asBool(linked[0].email_reminders, true);
        linkedEmail = normalizeEmail(linked[0].email);
      }
    }
    const deliverEmail = normalizeEmail(row.client_email) || linkedEmail;

    if (deliverEmail) {
      const existing = await findExisting(sql, row.id, deliverEmail, "client");
      if (existing?.status === "sent") {
        stats.skipped += 1;
      } else if (!clientOptIn) {
        await skipSend(sql, {
          jobId: row.id,
          cleanerUserId: row.cleaner_user_id,
          email: deliverEmail,
          role: "client",
          reason: "Client turned off email reminders",
          dueAt,
          existingId: existing?.id,
        });
        stats.skipped += 1;
      } else if (existing?.status === "skipped" && existing.error === "Client turned off email reminders") {
        stats.skipped += 1;
      } else {
        const result = await deliver(sql, {
          visit,
          cleanerUserId: row.cleaner_user_id,
          email: deliverEmail,
          role: "client",
          recipientName: row.client_name,
          dueAt,
          existingId: existing?.id,
        });
        stats[result.status === "sent" ? "sent" : result.status === "queued" ? "queued" : "failed"] += 1;
      }
    }

    if (!teamOn) continue;

    const assignees = await sql.query<{ user_id: string; full_name: string; email: string | null }>(
      `select p.user_id, p.full_name, p.email
       from job_assignees ja
       join profiles p on p.user_id = ja.user_id
       where ja.job_id = $1
         and p.cleaner_kind = 'team'
         and coalesce(p.team_status, 'active') = 'active'`,
      [row.id],
    );
    for (const assignee of assignees) {
      const email = normalizeEmail(assignee.email);
      if (!email) continue;
      const existing = await findExisting(sql, row.id, email, "team");
      if (existing?.status === "sent" || existing?.status === "skipped") {
        stats.skipped += 1;
        continue;
      }
      const result = await deliver(sql, {
        visit,
        cleanerUserId: row.cleaner_user_id,
        email,
        role: "team",
        recipientName: assignee.full_name,
        dueAt,
        existingId: existing?.id,
      });
      stats[result.status === "sent" ? "sent" : result.status === "queued" ? "queued" : "failed"] += 1;
    }
  }

  return stats;
}

export function ensureReminderScheduler() {
  if (typeof setInterval === "undefined") return;
  if (globalRef.__sweepbookReminderTimer__) return;
  const tick = () => {
    processDueReminders().catch((err) => {
      console.error("[sweepbook reminders]", err);
    });
  };
  if (!globalRef.__sweepbookReminderBoot__) {
    globalRef.__sweepbookReminderBoot__ = true;
    tick();
  }
  globalRef.__sweepbookReminderTimer__ = setInterval(tick, INTERVAL_MS);
  if (typeof globalRef.__sweepbookReminderTimer__.unref === "function") {
    globalRef.__sweepbookReminderTimer__.unref();
  }
}

export const getReminderStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    ensureReminderScheduler();
    const profile =
      actor.kind === "cleaner" || actor.kind === "client" || actor.kind === "team"
        ? actor.profile
        : null;
    return {
      mailConfigured: isMailConfigured(),
      fromEmail: fromAddress(),
      emailReminders: profile ? asBool(profile.email_reminders, true) : true,
      reminderEmailTeam: profile ? asBool(profile.reminder_email_team, false) : false,
      note: REMINDER_HOST_NOTE,
      canConfigureAccount: actor.kind === "cleaner",
      canConfigurePersonal: actor.kind === "client",
    };
  });

export const updateReminderSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { emailReminders: boolean; reminderEmailTeam?: boolean }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "team") {
      throw new Error("Team cleaners cannot change reminder settings.");
    }
    if (actor.kind === "cleaner") {
      await sql`
        update profiles
        set email_reminders = ${data.emailReminders},
            reminder_email_team = ${Boolean(data.reminderEmailTeam)}
        where user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    if (actor.kind === "client") {
      await sql`
        update profiles
        set email_reminders = ${data.emailReminders}
        where user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    throw new Error("Sign in to change reminder settings.");
  });

export const sendTestReminder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId?: string } | undefined) => input ?? {})
  .handler(async ({ context, data }): Promise<ReminderSendResult> => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    ensureReminderScheduler();

    if (data.jobId) {
      assertCleaner(actor);
      const rows = await sql.query<DueJob>(
        `select j.id, j.cleaner_user_id, j.service, j.address, j.start_at::text as start_at,
                j.duration_min, j.status, c.name as client_name, c.email as client_email,
                c.address as client_address, c.linked_user_id,
                m.business_name, m.full_name as master_name,
                m.email_reminders as master_reminders, m.reminder_email_team
         from jobs j
         join clients c on c.id = j.client_id
         join profiles m on m.user_id = j.cleaner_user_id
         where j.id = $1 and j.cleaner_user_id = $2
         limit 1`,
        [data.jobId, context.userId],
      );
      const row = rows[0];
      if (!row) throw new Error("Visit not found.");
      if (row.status === "cancelled") {
        throw new Error("This visit is cancelled — reminders are not sent.");
      }
      let email = normalizeEmail(row.client_email);
      if (!email && row.linked_user_id) {
        const linked = await sql.query<{ email: string | null }>(
          `select email from profiles where user_id = $1 limit 1`,
          [row.linked_user_id],
        );
        email = normalizeEmail(linked[0]?.email);
      }
      if (!email) throw new Error("This client has no email address on file.");
      return deliver(sql, {
        visit: toVisit(row),
        cleanerUserId: context.userId,
        email,
        role: "test",
        recipientName: row.client_name,
        dueAt: new Date(),
      });
    }

    const profile =
      actor.kind === "cleaner" || actor.kind === "client" || actor.kind === "team"
        ? actor.profile
        : null;
    const email = normalizeEmail(profile?.email) || normalizeEmail(actor.kind === "client" ? actor.client.email : null);
    if (!email) throw new Error("Your profile has no email address.");

    let visit: VisitForMail | null = null;
    if (actor.kind === "cleaner") {
      const upcoming = await sql.query<DueJob>(
        `select j.id, j.cleaner_user_id, j.service, j.address, j.start_at::text as start_at,
                j.duration_min, j.status, c.name as client_name, c.email as client_email,
                c.address as client_address, c.linked_user_id,
                m.business_name, m.full_name as master_name,
                m.email_reminders as master_reminders, m.reminder_email_team
         from jobs j
         join clients c on c.id = j.client_id
         join profiles m on m.user_id = j.cleaner_user_id
         where j.cleaner_user_id = $1 and j.status = 'scheduled' and j.start_at > now()
         order by j.start_at asc
         limit 1`,
        [context.userId],
      );
      if (upcoming[0]) visit = toVisit(upcoming[0]);
    } else if (actor.kind === "client") {
      const upcoming = await sql.query<DueJob>(
        `select j.id, j.cleaner_user_id, j.service, j.address, j.start_at::text as start_at,
                j.duration_min, j.status, c.name as client_name, c.email as client_email,
                c.address as client_address, c.linked_user_id,
                m.business_name, m.full_name as master_name,
                m.email_reminders as master_reminders, m.reminder_email_team
         from jobs j
         join clients c on c.id = j.client_id
         join profiles m on m.user_id = j.cleaner_user_id
         where j.client_id = $1 and j.status = 'scheduled' and j.start_at > now()
         order by j.start_at asc
         limit 1`,
        [actor.client.id],
      );
      if (upcoming[0]) visit = toVisit(upcoming[0]);
    }

    const business =
      actor.kind === "cleaner"
        ? actor.profile.business_name?.trim() || actor.profile.full_name
        : actor.kind === "client"
          ? actor.cleanerName
          : "SweepBook";
    const used = visit ?? sampleVisit(business);
    return deliver(sql, {
      visit: used,
      cleanerUserId: actor.kind === "cleaner" ? context.userId : actor.kind === "client" ? actor.client.cleaner_user_id : context.userId,
      email,
      role: "test",
      recipientName: profile?.full_name || "there",
      dueAt: new Date(),
    });
  });
