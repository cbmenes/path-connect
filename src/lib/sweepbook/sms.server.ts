import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "@/lib/db";
import { getSql } from "@/lib/db";
import { phoneDigits } from "./people";
import { confirmationText, nextSmsConsent, parseSmsConsent, parseSmsReply } from "./sms-consent";
import { isDemoAccountEmail } from "./types";

function accountSid() {
  return process.env.TWILIO_ACCOUNT_SID?.trim() || "";
}

function authToken() {
  return process.env.TWILIO_AUTH_TOKEN?.trim() || "";
}

function fromNumber() {
  return process.env.TWILIO_FROM_NUMBER?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim() || "";
}

export function isSmsConfigured() {
  return Boolean(accountSid() && authToken() && fromNumber());
}

export function toE164(phone: string | null | undefined) {
  const digits = phoneDigits(phone);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

async function postTwilio(to: string, body: string) {
  const sid = accountSid();
  const token = authToken();
  const from = fromNumber();
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
    const detail = (await res.text()).slice(0, 180);
    throw new Error(`Twilio ${res.status}: ${detail}`);
  }
}

export async function applyClientSmsRequest(
  sql: Sql,
  input: { clientId: string; ownerId: string; checked: boolean; phone: string | null },
) {
  const rows = await sql<{ sms_consent: string | null; sms_confirm_sent_to: string | null }>`
    select sms_consent, sms_confirm_sent_to
    from clients
    where id = ${input.clientId} and cleaner_user_id = ${input.ownerId}
    limit 1
  `;
  if (!rows[0]) return;
  const prev = parseSmsConsent(rows[0].sms_consent);
  const next = nextSmsConsent(prev, input.checked);
  await sql`
    update clients
    set sms_consent = ${next},
        sms_opt_in = ${next === "confirmed"}
    where id = ${input.clientId} and cleaner_user_id = ${input.ownerId}
  `;
  const phone = phoneDigits(input.phone);
  const alreadySent = prev === "requested" && rows[0].sms_confirm_sent_to === phone && Boolean(phone);
  if (next !== "requested" || !phone || alreadySent) return;
  const owner = await sql<{ business_name: string | null; full_name: string | null; email: string | null }>`
    select p.business_name, p.full_name, coalesce(u.email, p.email) as email
    from profiles p
    left join "user" u on u.id = p.user_id
    where p.user_id = ${input.ownerId}
    limit 1
  `;
  const company = owner[0]?.business_name?.trim() || owner[0]?.full_name?.trim() || "your cleaner";
  if (isDemoAccountEmail(owner[0]?.email)) {
    return "Consent requested. Demo accounts do not send texts.";
  }
  const to = toE164(phone);
  if (!to || !isSmsConfigured()) {
    return "Consent requested. The confirmation text could not be sent because SMS is not set up.";
  }
  try {
    await postTwilio(to, confirmationText(company));
  } catch (err) {
    console.error("SMS confirmation failed", err instanceof Error ? err.message : "unknown");
    return "Consent requested. The confirmation text could not be sent.";
  }
  await sql`
    update clients
    set sms_confirm_sent_to = ${phone}
    where id = ${input.clientId} and cleaner_user_id = ${input.ownerId}
  `;
  return "Confirmation text sent. They need to reply YES.";
}

export async function applyInboundSms(fromRaw: string, body: string) {
  const reply = parseSmsReply(body);
  const digits = phoneDigits(fromRaw);
  if (!reply || !digits) return { updated: 0 };
  const sql = await getSql();
  if (reply === "confirm") {
    const rows = await sql<{ id: string }>`
      update clients
      set sms_consent = 'confirmed',
          sms_confirmed_at = now(),
          sms_opt_in = true,
          sms_opt_in_at = now()
      where right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${digits}
      returning id
    `;
    return { updated: rows.length };
  }
  const rows = await sql<{ id: string }>`
    update clients
    set sms_consent = 'opted_out',
        sms_opt_in = false
    where right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${digits}
    returning id
  `;
  return { updated: rows.length };
}

export function twilioSignatureValid(url: string, params: Record<string, string>, signature: string, token: string) {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", token).update(payload, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
