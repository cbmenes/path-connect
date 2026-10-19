import type { Sql } from "@/lib/db";
import { fromAddress, sendMail } from "./mail";
import { phoneDigits } from "./people";
import { canSendOperationalSms, parseSmsConsent } from "./sms-consent";
import { clientNoticeBody, clientNoticeSubject, type ClientNoticeKind } from "./client-notice-copy";
import { isDemoAccountEmail } from "./types";
import { formatDate, formatTime, nid } from "./time";

/**
 * Operational SMS and email for consented clients.
 * Credentials stay in the host environment:
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, RESEND_API_KEY.
 * Delivery stays in test mode unless NOTIFY_DELIVERY=live.
 * Demo companies always stay in test mode.
 */

type NoticeRow = {
  job_id: string;
  start_at: string;
  address: string | null;
  client_id: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  sms_consent: string | null;
  company_name: string | null;
  owner_email: string | null;
};

export type ClientNoticeResult = {
  logged: boolean;
  summary: string | null;
};

function deliveryMode(ownerEmail: string | null): "dry-run" | "live" {
  if (isDemoAccountEmail(ownerEmail)) return "dry-run";
  return process.env.NOTIFY_DELIVERY?.trim().toLowerCase() === "live" ? "live" : "dry-run";
}

function toE164(phone: string | null | undefined) {
  const digits = phoneDigits(phone);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

function noticeDate(startAt: string) {
  return formatDate(startAt, { weekday: "long", month: "long", day: "numeric" });
}

async function alreadySent(sql: Sql, jobId: string, kind: ClientNoticeKind, channel: string) {
  const rows = await sql<{ id: string }>`
    select id from client_notices
    where job_id = ${jobId} and kind = ${kind} and channel = ${channel}
    limit 1
  `;
  return Boolean(rows[0]);
}

async function recordNotice(
  sql: Sql,
  input: {
    jobId: string;
    clientId: string;
    kind: ClientNoticeKind;
    channel: "sms" | "email";
    status: "dry_run" | "sent";
    destination: string;
    body: string;
  },
) {
  const id = nid("note");
  await sql`
    insert into client_notices (
      id, job_id, client_id, kind, channel, status, destination, body
    ) values (
      ${id}, ${input.jobId}, ${input.clientId}, ${input.kind}, ${input.channel},
      ${input.status}, ${input.destination}, ${input.body}
    )
  `;
}

async function postTwilio(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const from = process.env.TWILIO_FROM_NUMBER?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim() || "";
  if (!sid || !token || !from) throw new Error("SMS is not set up.");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}`);
  }
}

export async function sendClientNotice(
  sql: Sql,
  input: { jobId: string; kind: ClientNoticeKind },
): Promise<ClientNoticeResult> {
  const rows = await sql<NoticeRow>`
    select j.id as job_id, j.start_at::text as start_at, j.address,
           c.id as client_id, c.phone as client_phone, c.email as client_email, c.address as client_address,
           c.sms_consent,
           coalesce(nullif(trim(p.business_name), ''), nullif(trim(p.full_name), '')) as company_name,
           coalesce(u.email, p.email) as owner_email
    from jobs j
    join clients c on c.id = j.client_id
    join profiles p on p.user_id = j.cleaner_user_id
    left join "user" u on u.id = p.user_id
    where j.id = ${input.jobId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { logged: false, summary: null };
  if (!canSendOperationalSms(parseSmsConsent(row.sms_consent))) return { logged: false, summary: null };

  const body = clientNoticeBody(input.kind, {
    companyName: row.company_name || "",
    date: noticeDate(row.start_at),
    time: formatTime(row.start_at),
  });
  const mode = deliveryMode(row.owner_email);
  const channels: Array<"sms" | "email"> = [];
  const smsTo = toE164(row.client_phone);
  const emailTo = (row.client_email || "").trim();
  if (smsTo && !(await alreadySent(sql, row.job_id, input.kind, "sms"))) channels.push("sms");
  if (emailTo.includes("@") && !(await alreadySent(sql, row.job_id, input.kind, "email"))) channels.push("email");
  if (!channels.length) return { logged: false, summary: null };

  for (const channel of channels) {
    const destination = channel === "sms" ? smsTo! : emailTo;
    if (mode === "dry-run") {
      console.info(`[crewweek notify dry-run] ${channel} ${input.kind} to ${destination}: ${body}`);
      await recordNotice(sql, {
        jobId: row.job_id,
        clientId: row.client_id,
        kind: input.kind,
        channel,
        status: "dry_run",
        destination,
        body,
      });
      continue;
    }
    if (channel === "sms") {
      await postTwilio(destination, body);
    } else {
      await sendMail({
        to: destination,
        from: fromAddress(),
        subject: clientNoticeSubject(input.kind),
        text: body,
      });
    }
    await recordNotice(sql, {
      jobId: row.job_id,
      clientId: row.client_id,
      kind: input.kind,
      channel,
      status: "sent",
      destination,
      body,
    });
  }

  const what = channels.map((channel) => (channel === "sms" ? "text" : "email")).join(" and ");
  const summary = mode === "dry-run" ? `Test mode: ${what} logged, not sent.` : `${what} sent.`;
  return { logged: true, summary };
}
