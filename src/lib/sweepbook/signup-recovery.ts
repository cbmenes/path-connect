import type { Sql } from "@/lib/db";
import { getSql } from "@/lib/db";
import { isMailConfigured, sendMail } from "./mail";
import { signupRecoveryEmail, signupRecoveryShouldSend } from "./signup-recovery-copy";
import { platformCustomerBilling } from "./stripe.server";

export { SIGNUP_RECOVERY_SUBJECT, signupRecoveryEmail, signupRecoveryShouldSend } from "./signup-recovery-copy";

async function profileHasActivePlan(sql: Sql, customerId: string) {
  const rows = await sql<{ plan_status: string | null }>`
    select plan_status from profiles where stripe_customer_id = ${customerId} limit 1
  `;
  return rows[0]?.plan_status === "active";
}

export async function processDueSignupRecovery() {
  const sql = await getSql();
  const due = await sql<{ stripe_customer_id: string; email: string }>`
    select stripe_customer_id, email
    from signup_recovery_emails
    where status = 'pending' and send_after <= now()
    order by send_after
    limit 25
  `;
  let sent = 0;
  let skipped = 0;
  let waiting = 0;
  for (const row of due) {
    const claimed = await sql<{ stripe_customer_id: string }>`
      update signup_recovery_emails
      set status = 'sending'
      where stripe_customer_id = ${row.stripe_customer_id} and status = 'pending'
      returning stripe_customer_id
    `;
    if (!claimed[0]) continue;
    try {
      const activeHere = await profileHasActivePlan(sql, row.stripe_customer_id);
      const billing = activeHere
        ? { activeSubscription: true, successfulPayment: false }
        : await platformCustomerBilling(row.stripe_customer_id);
      if (
        !signupRecoveryShouldSend({
          alreadySent: false,
          activeSubscription: billing.activeSubscription,
          successfulPayment: billing.successfulPayment,
        })
      ) {
        await sql`
          update signup_recovery_emails
          set status = 'skipped', sent_at = now()
          where stripe_customer_id = ${row.stripe_customer_id} and status = 'sending'
        `;
        skipped += 1;
        continue;
      }
      if (!isMailConfigured()) {
        await sql`
          update signup_recovery_emails
          set status = 'pending'
          where stripe_customer_id = ${row.stripe_customer_id} and status = 'sending'
        `;
        waiting += 1;
        continue;
      }
      const copy = signupRecoveryEmail();
      await sendMail({ to: row.email, subject: copy.subject, text: copy.text, html: copy.html });
      await sql`
        update signup_recovery_emails
        set status = 'sent', sent_at = now()
        where stripe_customer_id = ${row.stripe_customer_id} and status = 'sending'
      `;
      sent += 1;
    } catch (err) {
      console.error("[signup-recovery]", err instanceof Error ? err.message : "failed");
      await sql`
        update signup_recovery_emails
        set status = 'pending'
        where stripe_customer_id = ${row.stripe_customer_id} and status = 'sending'
      `;
      waiting += 1;
    }
  }
  return { checked: due.length, sent, skipped, waiting, mailConfigured: isMailConfigured() };
}
