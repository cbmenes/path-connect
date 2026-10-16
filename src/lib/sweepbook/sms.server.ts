import { createHmac, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { phoneDigits } from "./people";
import { parseSmsReply } from "./sms-consent";

/** STOP opts the matching client out. YES does not record consent — the client form does. */
export async function applyInboundSms(fromRaw: string, body: string) {
  const reply = parseSmsReply(body);
  const digits = phoneDigits(fromRaw);
  if (!reply || !digits) return { updated: 0 };
  const sql = await getSql();
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
