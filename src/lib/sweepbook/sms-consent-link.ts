import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertActivePlan, assertOffice, getActor, masterUserId } from "./access";
import { formatPhoneAsTyped, phoneDigits } from "./people";
import { parseSmsConsent } from "./sms-consent";
import { nid } from "./time";

export const createSmsConsentLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ context, data: clientId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertActivePlan(sql, actor);
    const ownerId = masterUserId(actor);
    const rows = await sql<{ sms_consent_token: string | null }>`
      select sms_consent_token from clients
      where id = ${clientId} and cleaner_user_id = ${ownerId}
      limit 1
    `;
    if (!rows[0]) throw new Error("Client not found.");
    let token = rows[0].sms_consent_token;
    if (!token) {
      token = nid("sms").replace(/-/g, "");
      await sql`
        update clients set sms_consent_token = ${token}
        where id = ${clientId} and cleaner_user_id = ${ownerId}
      `;
    }
    return { token, path: `/consent/${token}` };
  });

export const getSmsConsentPage = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const sql = await getSql();
    const rows = await sql<{
      name: string;
      phone: string | null;
      sms_consent: string | null;
      company_name: string | null;
    }>`
      select c.name, c.phone, c.sms_consent,
             coalesce(nullif(trim(p.business_name), ''), nullif(trim(p.full_name), '')) as company_name
      from clients c
      join profiles p on p.user_id = c.cleaner_user_id
      where c.sms_consent_token = ${token}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("This consent link is invalid.");
    const phone = formatPhoneAsTyped(row.phone);
    return {
      clientName: row.name,
      companyName: row.company_name || "your cleaning company",
      phone: phone || "No phone number on file",
      hasPhone: Boolean(phoneDigits(row.phone)),
      status: parseSmsConsent(row.sms_consent),
    };
  });

export const submitSmsConsent = createServerFn({ method: "POST" })
  .validator((input: { token: string; agreed: boolean }) => input)
  .handler(async ({ data }) => {
    if (data.agreed !== true) throw new Error("Check the box to opt in.");
    const sql = await getSql();
    const rows = await sql<{ phone: string | null }>`
      select phone from clients where sms_consent_token = ${data.token} limit 1
    `;
    if (!rows[0]) throw new Error("This consent link is invalid.");
    if (!phoneDigits(rows[0].phone)) throw new Error("There is no phone number on file.");
    const updated = await sql<{ id: string }>`
      update clients
      set sms_consent = 'confirmed',
          sms_confirmed_at = now(),
          sms_opt_in = true,
          sms_opt_in_at = now()
      where sms_consent_token = ${data.token}
      returning id
    `;
    if (updated.length !== 1) throw new Error("This consent link is invalid.");
    return { ok: true as const };
  });
