import { getSql } from "@/lib/db";
import { insertNotification } from "./notifications";
import { formatDateTime, money } from "./time";

/**
 * Marks a visit paid from a Checkout Session that was already retrieved
 * on the connected account. This file does not import the Stripe SDK.
 */
export type ConnectedChargeSession = {
  id: string;
  livemode: boolean;
  payment_status: string | null;
  amount_total: number | null;
  metadata: { purpose?: string; invoice_id?: string } | null;
  payment_intent?:
    | string
    | null
    | {
        id: string;
        latest_charge?:
          | string
          | null
          | {
              payment_method_details?: {
                card?: { brand?: string | null; last4?: string | null } | null;
              } | null;
            };
      };
};

function receiptNo() {
  return `SB-${Math.floor(100000 + Math.random() * 900000)}`;
}

function cardFromSession(session: ConnectedChargeSession) {
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") {
    return { paymentIntentId: typeof pi === "string" ? pi : null, brand: "Card", last4: "" };
  }
  const charge = pi.latest_charge;
  const card = charge && typeof charge !== "string" ? charge.payment_method_details?.card : null;
  return { paymentIntentId: pi.id, brand: card?.brand || "Card", last4: card?.last4 || "" };
}

export async function applyConnectedCharge(session: ConnectedChargeSession, accountId: string) {
  if (!session.id.startsWith("cs_") || session.livemode) return { paid: false as const };
  if (session.metadata?.purpose !== "client_charge" || !session.metadata.invoice_id) {
    return { paid: false as const };
  }
  if (session.payment_status !== "paid") return { paid: false as const };
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    stripe_account_id: string | null;
    amount_cents: number;
    job_id: string | null;
    kind: string;
    cleaner_user_id: string;
    client_id: string;
  }>`
    select id, stripe_account_id, amount_cents, job_id, kind, cleaner_user_id, client_id
    from invoices
    where stripe_checkout_session_id = ${session.id}
    limit 1
  `;
  const invoice = rows[0];
  if (!invoice?.stripe_account_id || invoice.stripe_account_id !== accountId) return { paid: false as const };
  if (session.metadata.invoice_id !== invoice.id) return { paid: false as const };
  if (session.amount_total !== Number(invoice.amount_cents)) return { paid: false as const };
  const hint = cardFromSession(session);
  const receipt = receiptNo();
  const flipped = await sql<{ id: string; receipt_number: string | null }>`
    update invoices set
      status = 'paid',
      method = 'card',
      paid_at = now(),
      failure_reason = null,
      receipt_number = coalesce(receipt_number, ${receipt}),
      stripe_payment_intent_id = ${hint.paymentIntentId}
    where id = ${invoice.id} and status <> 'paid'
    returning id, receipt_number
  `;
  if (flipped[0] && invoice.job_id && invoice.kind === "visit") {
    await sql`
      update jobs set status = 'completed'
      where id = ${invoice.job_id} and cleaner_user_id = ${invoice.cleaner_user_id}
    `;
  }
  if (flipped[0] && invoice.job_id && invoice.kind === "tip") {
    const jobs = await sql<{ service: string; start_at: string; client_name: string }>`
      select j.service, j.start_at::text as start_at, c.name as client_name
      from jobs j
      join clients c on c.id = j.client_id
      where j.id = ${invoice.job_id}
      limit 1
    `;
    await sql`
      update jobs set tip_cents = tip_cents + ${Number(invoice.amount_cents)}, tip_requested = false
      where id = ${invoice.job_id}
    `;
    const job = jobs[0];
    if (job) {
      await insertNotification(sql, {
        userId: invoice.cleaner_user_id,
        kind: "tip",
        title: `${job.client_name} left a ${money(Number(invoice.amount_cents))} tip`,
        body: `${formatDateTime(job.start_at)} · ${job.service}`,
        jobId: invoice.job_id,
        clientId: invoice.client_id,
        clientName: job.client_name,
        requestedStartAt: job.start_at,
      });
    }
  }
  const saved = flipped[0]
    ? flipped[0].receipt_number
    : (
        await sql<{ receipt_number: string | null }>`
          select receipt_number from invoices where id = ${invoice.id} limit 1
        `
      )[0]?.receipt_number;
  return {
    paid: true as const,
    receiptNumber: saved || receipt,
    brand: hint.brand,
    last4: hint.last4,
    amountCents: Number(invoice.amount_cents),
    invoiceId: invoice.id,
  };
}
