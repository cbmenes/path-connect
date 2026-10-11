import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCanCharge, assertClient, assertActivePlan, canChargeClients, getActor, isOffice, masterUserId } from "./access";
import { ensureDemoSeed } from "./seed";
import { detectBrand, luhnOk } from "./card-utils";
import { nid, formatDateTime, money } from "./time";
import { insertNotification } from "./notifications";
import { isDemoAccountEmail, type CardRow, type InvoiceWithClient, type JobRow } from "./types";

const INVOICE_SELECT = `
  i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
  i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
  i.receipt_number, i.paid_note, i.created_at::text as created_at, c.name as client_name,
  j.start_at::text as job_start_at
`;

function trimPaidNote(note?: string | null) {
  const t = (note ?? "").trim();
  if (!t) return null;
  if (t.length > 120) throw new Error("Note is too long.");
  return t;
}

function receiptNo() {
  return `SB-${Math.floor(100000 + Math.random() * 900000)}`;
}

const CONNECT_REQUIRED = "Connect Stripe in Settings before charging a card.";
const SETUP_REQUIRED = "Finish Stripe setup in Settings before charging a card.";

type ChargeLane = { lane: "demo" } | { lane: "stripe"; accountId: string };

/**
 * Demo stays a dry run and never calls Stripe.
 * A restricted or unfinished connected account cannot charge.
 * An enabled account charges on that connected account, not the CrewWeek platform account.
 */
async function cardChargeLane(sql: Awaited<ReturnType<typeof getSql>>, ownerId: string): Promise<ChargeLane> {
  const rows = await sql<{ email: string | null; stripe_account_id: string | null }>`
    select u.email, p.stripe_account_id
    from profiles p
    join "user" u on u.id = p.user_id
    where p.user_id = ${ownerId}
    limit 1
  `;
  if (isDemoAccountEmail(rows[0]?.email)) return { lane: "demo" };
  const accountId = rows[0]?.stripe_account_id;
  if (!accountId) throw new Error(CONNECT_REQUIRED);
  const { stripeCardPaymentsEnabled } = await import("./stripe.server");
  if (!(await stripeCardPaymentsEnabled(accountId))) throw new Error(SETUP_REQUIRED);
  return { lane: "stripe", accountId };
}

async function openStripeCharge(
  sql: Awaited<ReturnType<typeof getSql>>,
  args: {
    ownerId: string;
    accountId: string;
    clientId: string;
    jobId?: string | null;
    kind: "visit" | "tip" | "other";
    amountCents: number;
    description: string;
    invoiceId?: string;
  },
) {
  let invoiceId = args.invoiceId;
  if (!invoiceId && args.jobId && args.kind === "visit") {
    const found = await sql<{ id: string; status: string }>`
      select id, status from invoices
      where job_id = ${args.jobId} and kind = 'visit' and cleaner_user_id = ${args.ownerId}
      limit 1
    `;
    if (found[0]?.status === "paid") throw new Error("Already paid.");
    invoiceId = found[0]?.id;
  }
  if (invoiceId) {
    const updated = await sql<{ id: string }>`
      update invoices set
        amount_cents = ${args.amountCents},
        description = ${args.description},
        status = 'unpaid',
        method = ${null},
        paid_at = ${null},
        failure_reason = ${null},
        receipt_number = ${null},
        stripe_payment_intent_id = ${null}
      where id = ${invoiceId} and cleaner_user_id = ${args.ownerId} and status <> 'paid'
      returning id
    `;
    if (!updated[0]) throw new Error("Already paid.");
  } else {
    invoiceId = nid("inv");
    await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status, kind
      ) values (
        ${invoiceId}, ${args.ownerId}, ${args.clientId}, ${args.jobId ?? null},
        ${args.amountCents}, ${args.description}, ${"unpaid"}, ${args.kind}
      )
    `;
  }
  const clients = await sql<{ email: string | null }>`
    select email from clients where id = ${args.clientId} and cleaner_user_id = ${args.ownerId} limit 1
  `;
  const { createConnectedChargeCheckout } = await import("./stripe.server");
  const session = await createConnectedChargeCheckout({
    accountId: args.accountId,
    amountCents: args.amountCents,
    description: args.description,
    invoiceId,
    customerEmail: clients[0]?.email,
  });
  await sql`
    update invoices
    set stripe_checkout_session_id = ${session.sessionId},
        stripe_account_id = ${args.accountId}
    where id = ${invoiceId}
  `;
  return { ok: false as const, pending: true as const, checkoutUrl: session.url };
}

function pickChargeCard(cards: CardRow[], cardId?: string): CardRow | undefined {
  if (cardId) {
    return cards.find((c) => c.id === cardId) ?? cards.find((c) => c.is_default) ?? cards[0];
  }
  const preferred = cards.find((c) => c.is_default);
  const clientDefault =
    cards.find((c) => c.source === "client" && c.is_default) ?? cards.find((c) => c.source === "client");
  const backup =
    cards.find((c) => c.source === "cleaner" && c.is_default) ?? cards.find((c) => c.source === "cleaner");
  return preferred ?? clientDefault ?? backup ?? cards[0];
}

/** Fill paid_at only when a paid row never recorded one. Does not change existing timestamps. */
export async function backfillPaidAt(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    update invoices
    set paid_at = created_at
    where status = 'paid' and paid_at is null
  `;
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    await backfillPaidAt(sql);
    const actor = await getActor(sql, context.userId);
    if (isOffice(actor)) {
      return sql.query<InvoiceWithClient>(
        `select ${INVOICE_SELECT}
         from invoices i
         join clients c on c.id = i.client_id
         left join jobs j on j.id = i.job_id
         where i.cleaner_user_id = $1
         order by i.created_at desc
         limit 400`,
        [masterUserId(actor)],
      );
    }
    if (actor.kind === "client") {
      return sql.query<InvoiceWithClient>(
        `select ${INVOICE_SELECT}
         from invoices i
         join clients c on c.id = i.client_id
         left join jobs j on j.id = i.job_id
         where i.client_id = $1
         order by i.created_at desc
         limit 400`,
        [actor.client.id],
      );
    }
    return [] as InvoiceWithClient[];
  });

export const listCardsForClient = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ context, data: clientId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (isOffice(actor)) {
      if (!canChargeClients(actor)) return [] as CardRow[];
      return sql<CardRow>`
        select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
               holder_name, source, is_default, failing, created_at::text as created_at
        from payment_cards
        where client_id = ${clientId} and cleaner_user_id = ${masterUserId(actor)}
        order by is_default desc, created_at desc
      `;
    }
    if (actor.kind === "client" && actor.client.id === clientId) {
      return sql<CardRow>`
        select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
               holder_name, source, is_default, failing, created_at::text as created_at
        from payment_cards
        where client_id = ${clientId}
        order by is_default desc, created_at desc
      `;
    }
    throw new Error("Not found.");
  });

export type CardFormInput = {
  clientId?: string;
  token?: string;
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  holderName: string;
  source: "client" | "cleaner";
};

async function saveCard(
  sql: Awaited<ReturnType<typeof getSql>>,
  args: {
    cleanerUserId: string;
    clientId: string;
    number: string;
    expMonth: number;
    expYear: number;
    holderName: string;
    source: "client" | "cleaner";
  },
) {
  const digits = args.number.replace(/\D/g, "");
  if (!luhnOk(digits)) throw new Error("That card number is not valid.");
  const brand = detectBrand(digits);
  const last4 = digits.slice(-4);
  const failing = digits === "4000000000000002" || last4 === "0002";
  const existing = await sql<{ id: string }>`
    select id from payment_cards
    where client_id = ${args.clientId} and cleaner_user_id = ${args.cleanerUserId}
  `;
  const isDefault = existing.length === 0 || args.source === "client";
  if (isDefault) {
    await sql`
      update payment_cards set is_default = false
      where client_id = ${args.clientId} and cleaner_user_id = ${args.cleanerUserId}
    `;
  }
  const id = nid("card");
  await sql`
    insert into payment_cards (
      id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
      holder_name, source, is_default, failing
    ) values (
      ${id}, ${args.cleanerUserId}, ${args.clientId}, ${brand}, ${last4},
      ${args.expMonth}, ${args.expYear}, ${args.holderName || null}, ${args.source},
      ${isDefault}, ${failing}
    )
  `;
  return { id, brand, last4, failing };
}

export const addCardAuthenticated = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CardFormInput) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (isOffice(actor)) {
      assertCanCharge(actor);
      if (!data.clientId) throw new Error("Choose a client.");
      const ownerId = masterUserId(actor);
      const owned = await sql`select id from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1`;
      if (!owned[0]) throw new Error("Client not found.");
      const lane = await cardChargeLane(sql, ownerId);
      if (lane.lane !== "demo") throw new Error("Stripe collects the card. CrewWeek does not store the card number.");
      return saveCard(sql, {
        cleanerUserId: ownerId,
        clientId: data.clientId,
        number: data.number,
        expMonth: data.expMonth,
        expYear: data.expYear,
        holderName: data.holderName,
        source: "cleaner",
      });
    }
    if (actor.kind === "client") {
      const lane = await cardChargeLane(sql, actor.client.cleaner_user_id);
      if (lane.lane !== "demo") throw new Error("Stripe collects the card. CrewWeek does not store the card number.");
      return saveCard(sql, {
        cleanerUserId: actor.client.cleaner_user_id,
        clientId: actor.client.id,
        number: data.number,
        expMonth: data.expMonth,
        expYear: data.expYear,
        holderName: data.holderName,
        source: "client",
      });
    }
    throw new Error("Sign in to add a card.");
  });

export const addCardByToken = createServerFn({ method: "POST" })
  .validator((input: CardFormInput) => input)
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("This link is missing a token.");
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const links = await sql<{ cleaner_user_id: string; client_id: string; used_at: string | null }>`
      select cleaner_user_id, client_id, used_at::text as used_at
      from card_links where token = ${data.token} limit 1
    `;
    const link = links[0];
    if (!link) throw new Error("This add-card link is invalid.");
    const lane = await cardChargeLane(sql, link.cleaner_user_id);
    if (lane.lane !== "demo") throw new Error("Stripe collects the card. CrewWeek does not store the card number.");
    const saved = await saveCard(sql, {
      cleanerUserId: link.cleaner_user_id,
      clientId: link.client_id,
      number: data.number,
      expMonth: data.expMonth,
      expYear: data.expYear,
      holderName: data.holderName,
      source: "client",
    });
    await sql`update card_links set used_at = now() where token = ${data.token}`;
    return saved;
  });

export const createCardLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ context, data: clientId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCanCharge(actor);
    const ownerId = masterUserId(actor);
    const owned = await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${ownerId} limit 1`;
    if (!owned[0]) throw new Error("Client not found.");
    const token = nid("cardlink").replace(/-/g, "").slice(0, 22);
    await sql`
      insert into card_links (id, token, cleaner_user_id, client_id)
      values (${nid("clink")}, ${token}, ${ownerId}, ${clientId})
    `;
    return { token, path: `/add-card/${token}` };
  });

export const setDefaultCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { cardId: string; clientId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const owner =
      isOffice(actor)
        ? (assertCanCharge(actor), masterUserId(actor))
        : actor.kind === "client" && actor.client.id === data.clientId
          ? actor.client.cleaner_user_id
          : null;
    if (!owner) throw new Error("Not found.");
    if (actor.kind === "client" && actor.client.id !== data.clientId) throw new Error("Not found.");
    await sql`
      update payment_cards set is_default = false
      where client_id = ${data.clientId} and cleaner_user_id = ${owner}
    `;
    await sql`
      update payment_cards set is_default = true
      where id = ${data.cardId} and client_id = ${data.clientId} and cleaner_user_id = ${owner}
    `;
    return { ok: true };
  });

export const removeCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { cardId: string; clientId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const owner =
      isOffice(actor)
        ? (assertCanCharge(actor), masterUserId(actor))
        : actor.kind === "client" && actor.client.id === data.clientId
          ? actor.client.cleaner_user_id
          : null;
    if (!owner) throw new Error("Not found.");
    const row = await sql<{ is_default: boolean }>`
      select is_default from payment_cards
      where id = ${data.cardId} and client_id = ${data.clientId} and cleaner_user_id = ${owner} limit 1
    `;
    if (!row[0]) throw new Error("Card not found.");
    await sql`
      delete from payment_cards
      where id = ${data.cardId} and client_id = ${data.clientId} and cleaner_user_id = ${owner}
    `;
    if (row[0].is_default) {
      const next = await sql<{ id: string }>`
        select id from payment_cards
        where client_id = ${data.clientId} and cleaner_user_id = ${owner}
        order by created_at desc limit 1
      `;
      if (next[0]) {
        await sql`update payment_cards set is_default = true where id = ${next[0].id}`;
      }
    }
    return { ok: true };
  });

export const chargeCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clientId: string; amountCents: number; description: string; jobId?: string; kind?: "visit" | "tip" | "other"; cardId?: string }) => {
    if (!input.clientId) throw new Error("Choose a client.");
    if (!input.amountCents || input.amountCents < 50) throw new Error("Amount must be at least $0.50.");
    if (!input.description.trim()) throw new Error("Add a description.");
    return { ...input, description: input.description.trim(), kind: input.kind ?? "visit" };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCanCharge(actor);
    await assertActivePlan(sql, actor);
    const ownerId = masterUserId(actor);
    const lane = await cardChargeLane(sql, ownerId);
    if (lane.lane === "stripe") {
      const owned = await sql`select id from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1`;
      if (!owned[0]) throw new Error("Client not found.");
      return openStripeCharge(sql, {
        ownerId,
        accountId: lane.accountId,
        clientId: data.clientId,
        jobId: data.jobId,
        kind: data.kind,
        amountCents: data.amountCents,
        description: data.description,
      });
    }
    const owned = await sql`select id, name from clients where id = ${data.clientId} and cleaner_user_id = ${ownerId} limit 1`;
    if (!owned[0]) throw new Error("Client not found.");
    const cards = await sql<CardRow>`
      select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
             holder_name, source, is_default, failing, created_at::text as created_at
      from payment_cards
      where client_id = ${data.clientId} and cleaner_user_id = ${ownerId}
    `;
    const card = pickChargeCard(cards, data.cardId);
    if (!card) throw new Error("No card on file. Send an add-card link or collect one on site.");
    const failed = card.failing;
    const rec = failed ? null : receiptNo();
    let existing: { id: string; status: string } | undefined;
    if (data.jobId && data.kind === "visit") {
      const found = await sql<{ id: string; status: string }>`
        select id, status from invoices
        where job_id = ${data.jobId} and kind = 'visit' and cleaner_user_id = ${ownerId}
        limit 1
      `;
      existing = found[0];
    }
    if (existing) {
      await sql`
        update invoices set
          amount_cents = ${data.amountCents},
          description = ${data.description},
          status = ${failed ? "unpaid" : "paid"},
          method = ${"card"},
          kind = ${data.kind},
          paid_at = ${failed ? null : new Date().toISOString()},
          failure_reason = ${failed ? "Card declined — the issuer did not authorize this charge." : null},
          receipt_number = ${rec}
        where id = ${existing.id}
      `;
    } else {
      const id = nid("inv");
      await sql`
        insert into invoices (
          id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
          method, kind, paid_at, failure_reason, receipt_number
        ) values (
          ${id}, ${ownerId}, ${data.clientId}, ${data.jobId ?? null}, ${data.amountCents},
          ${data.description}, ${failed ? "unpaid" : "paid"}, ${"card"}, ${data.kind},
          ${failed ? null : new Date().toISOString()},
          ${failed ? "Card declined — the issuer did not authorize this charge." : null},
          ${rec}
        )
      `;
      existing = { id, status: failed ? "unpaid" : "paid" };
    }
    if (failed) {
      return { ok: false as const, invoiceId: existing.id, reason: "Card declined. Ask the client to update their card.", brand: card.brand, last4: card.last4 };
    }
    if (data.kind === "tip" && data.jobId) {
      await sql`
        update jobs set tip_cents = tip_cents + ${data.amountCents}, tip_requested = false
        where id = ${data.jobId} and cleaner_user_id = ${ownerId}
      `;
    }
    if (data.kind === "visit" && data.jobId) {
      await sql`
        update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${ownerId}
      `;
    }
    return {
      ok: true as const,
      invoiceId: existing.id,
      receiptNumber: rec,
      amountCents: data.amountCents,
      description: data.description,
      brand: card.brand,
      last4: card.last4,
    };
  });

export const markAsPaid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId?: string; invoiceId?: string; note?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCanCharge(actor);
    await assertActivePlan(sql, actor);
    const ownerId = masterUserId(actor);
    const note = trimPaidNote(data.note);
    const now = new Date().toISOString();
    const rec = receiptNo();

    if (data.invoiceId) {
      const existing = await sql<{
        id: string;
        status: string;
        job_id: string | null;
        kind: string;
        receipt_number: string | null;
      }>`
        select id, status, job_id, kind, receipt_number
        from invoices
        where id = ${data.invoiceId} and cleaner_user_id = ${ownerId}
        limit 1
      `;
      const row = existing[0];
      if (!row) throw new Error("Invoice not found.");
      if (row.status === "paid") throw new Error("Already paid.");
      const receipt = row.receipt_number || rec;
      await sql`
        update invoices
        set status = 'paid', method = ${"marked"}, paid_at = ${now}, paid_note = ${note},
            receipt_number = ${receipt}, failure_reason = null
        where id = ${row.id} and cleaner_user_id = ${ownerId}
      `;
      return { ok: true as const, receiptNumber: receipt, invoiceId: row.id };
    }

    if (!data.jobId) throw new Error("Missing appointment.");
    const jobs = await sql<Pick<JobRow, "id" | "client_id" | "service" | "price_cents" | "status">>`
      select id, client_id, service, price_cents, status
      from jobs
      where id = ${data.jobId} and cleaner_user_id = ${ownerId}
      limit 1
    `;
    const job = jobs[0];
    if (!job) throw new Error("Appointment not found.");
    if (job.status === "cancelled") throw new Error("This visit was cancelled.");

    const found = await sql<{ id: string; status: string; receipt_number: string | null }>`
      select id, status, receipt_number
      from invoices
      where job_id = ${job.id} and kind = 'visit' and cleaner_user_id = ${ownerId}
      limit 1
    `;
    const inv = found[0];
    if (inv?.status === "paid") throw new Error("Already paid.");

    if (inv) {
      const receipt = inv.receipt_number || rec;
      await sql`
        update invoices
        set status = 'paid', method = ${"marked"}, paid_at = ${now}, paid_note = ${note},
            receipt_number = ${receipt}, failure_reason = null
        where id = ${inv.id}
      `;
      return { ok: true as const, receiptNumber: receipt, invoiceId: inv.id };
    }

    const id = nid("inv");
    const receipt = `SB-${id.slice(-6).toUpperCase()}`;
    await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
        method, kind, paid_at, paid_note, receipt_number
      ) values (
        ${id}, ${ownerId}, ${job.client_id}, ${job.id}, ${job.price_cents},
        ${job.service}, ${"paid"}, ${"marked"}, ${"visit"}, ${now}, ${note}, ${receipt}
      )
    `;
    return { ok: true as const, receiptNumber: receipt, invoiceId: id };
  });

export const payInvoiceAsClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { invoiceId: string; cardId?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertClient(actor);
    const inv = await sql<InvoiceWithClient>`
      select id, amount_cents, description, status, client_id, job_id, kind
      from invoices where id = ${data.invoiceId} and client_id = ${actor.client.id} limit 1
    `;
    const invoice = inv[0];
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "paid") throw new Error("Already paid.");
    const lane = await cardChargeLane(sql, actor.client.cleaner_user_id);
    if (lane.lane === "stripe") {
      return openStripeCharge(sql, {
        ownerId: actor.client.cleaner_user_id,
        accountId: lane.accountId,
        clientId: actor.client.id,
        jobId: invoice.job_id,
        kind: invoice.kind === "tip" || invoice.kind === "other" ? invoice.kind : "visit",
        amountCents: invoice.amount_cents,
        description: invoice.description,
        invoiceId: invoice.id,
      });
    }
    const cards = await sql<CardRow>`
      select id, brand, last4, source, is_default, failing from payment_cards
      where client_id = ${actor.client.id}
    `;
    const card = pickChargeCard(cards as CardRow[], data.cardId);
    if (!card) throw new Error("Add a card to pay.");
    if (card.failing) {
      await sql`
        update invoices set status = 'failed', method = 'card',
          failure_reason = 'Card declined — please update your card.'
        where id = ${invoice.id}
      `;
      return { ok: false as const, reason: "Card declined. Update your card and try again.", needsCard: true };
    }
    const rec = receiptNo();
    await sql`
      update invoices set status = 'paid', method = 'card', paid_at = now(),
        receipt_number = ${rec}, failure_reason = null
      where id = ${invoice.id} and client_id = ${actor.client.id}
    `;
    if (invoice.job_id && invoice.kind === "visit") {
      await sql`update jobs set status = 'completed' where id = ${invoice.job_id}`;
    }
    return {
      ok: true as const,
      receiptNumber: rec,
      amountCents: invoice.amount_cents,
      description: invoice.description,
      brand: card.brand,
      last4: card.last4,
    };
  });

export const tipJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; amountCents: number; cardId?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertClient(actor);
    if (data.amountCents < 100) throw new Error("Tips must be at least $1.");
    const jobs = await sql<{ id: string; service: string; status: string; start_at: string }>`
      select id, service, status, start_at::text as start_at from jobs
      where id = ${data.jobId} and client_id = ${actor.client.id} limit 1
    `;
    const job = jobs[0];
    if (!job || job.status !== "completed") throw new Error("Tips are available after a completed visit.");
    const lane = await cardChargeLane(sql, actor.client.cleaner_user_id);
    if (lane.lane === "stripe") {
      return openStripeCharge(sql, {
        ownerId: actor.client.cleaner_user_id,
        accountId: lane.accountId,
        clientId: actor.client.id,
        jobId: job.id,
        kind: "tip",
        amountCents: data.amountCents,
        description: `Tip — ${job.service}`,
      });
    }
    const cards = await sql<CardRow>`
      select id, brand, last4, source, is_default, failing from payment_cards
      where client_id = ${actor.client.id}
    `;
    const card = pickChargeCard(cards as CardRow[], data.cardId);
    if (!card) throw new Error("Add a card to send a tip.");
    if (card.failing) {
      return { ok: false as const, reason: "Card declined. Update your card and try again.", needsCard: true };
    }
    const rec = receiptNo();
    const id = nid("inv");
    await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status, method, kind, paid_at, receipt_number
      ) values (
        ${id}, ${actor.client.cleaner_user_id}, ${actor.client.id}, ${job.id}, ${data.amountCents},
        ${`Tip — ${job.service}`}, ${"paid"}, ${"card"}, ${"tip"}, ${new Date().toISOString()}, ${rec}
      )
    `;
    await sql`
      update jobs set tip_cents = tip_cents + ${data.amountCents}, tip_requested = false
      where id = ${job.id}
    `;
    await insertNotification(sql, {
      userId: actor.client.cleaner_user_id,
      kind: "tip",
      title: `${actor.client.name} left a ${money(data.amountCents)} tip`,
      body: `${formatDateTime(job.start_at)} · ${job.service}`,
      jobId: job.id,
      clientId: actor.client.id,
      clientName: actor.client.name,
      requestedStartAt: job.start_at,
    });
    return { ok: true as const, receiptNumber: rec, amountCents: data.amountCents, brand: card.brand, last4: card.last4 };
  });

export const requestTip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((jobId: string) => jobId)
  .handler(async ({ context, data: jobId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCanCharge(actor);
    await assertActivePlan(sql, actor);
    await sql`
      update jobs set tip_requested = true
      where id = ${jobId} and cleaner_user_id = ${masterUserId(actor)} and status = 'completed'
    `;
    return { ok: true };
  });

function cardFromSession(session: {
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
}) {
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") {
    return { paymentIntentId: typeof pi === "string" ? pi : null, brand: "Card", last4: "" };
  }
  const charge = pi.latest_charge;
  const card = charge && typeof charge !== "string" ? charge.payment_method_details?.card : null;
  return { paymentIntentId: pi.id, brand: card?.brand || "Card", last4: card?.last4 || "" };
}

/** Mark a visit paid only after Stripe reports the connected-account charge succeeded. */
export async function settleClientCheckoutSession(sessionId: string, accountHint?: string | null) {
  if (!sessionId.startsWith("cs_")) return { paid: false as const };
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    stripe_account_id: string | null;
    amount_cents: number;
    status: string;
    job_id: string | null;
    kind: string;
    cleaner_user_id: string;
    client_id: string;
  }>`
    select id, stripe_account_id, amount_cents, status, job_id, kind, cleaner_user_id, client_id
    from invoices
    where stripe_checkout_session_id = ${sessionId}
    limit 1
  `;
  const invoice = rows[0];
  if (!invoice?.stripe_account_id) return { paid: false as const };
  if (accountHint && accountHint !== invoice.stripe_account_id) return { paid: false as const };
  const { retrieveConnectedChargeSession } = await import("./stripe.server");
  const session = await retrieveConnectedChargeSession(invoice.stripe_account_id, sessionId);
  if (session.livemode) return { paid: false as const };
  if (session.metadata?.purpose !== "client_charge" || session.metadata.invoice_id !== invoice.id) {
    return { paid: false as const };
  }
  if (session.amount_total !== Number(invoice.amount_cents) || session.payment_status !== "paid") {
    return { paid: false as const };
  }
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

export const confirmClientCharge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId: string }) => {
    if (!input.sessionId?.startsWith("cs_")) throw new Error("Missing Stripe charge.");
    return { sessionId: input.sessionId };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const rows = await sql<{ cleaner_user_id: string; client_id: string }>`
      select cleaner_user_id, client_id
      from invoices
      where stripe_checkout_session_id = ${data.sessionId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("This charge was not found.");
    if (actor.kind === "client") {
      if (actor.client.id !== row.client_id) throw new Error("This charge was not found.");
    } else if (isOffice(actor)) {
      if (masterUserId(actor) !== row.cleaner_user_id) throw new Error("This charge was not found.");
    } else {
      throw new Error("This charge was not found.");
    }
    const settled = await settleClientCheckoutSession(data.sessionId, null);
    if (!settled.paid) throw new Error("Stripe has not confirmed this charge.");
    return settled;
  });

export const getClientChargeMode = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const ownerId =
      actor.kind === "client" || actor.kind === "cleaner" || actor.kind === "admin"
        ? masterUserId(actor)
        : null;
    if (!ownerId) return { mode: "blocked" as const };
    try {
      const lane = await cardChargeLane(sql, ownerId);
      return { mode: lane.lane };
    } catch {
      return { mode: "blocked" as const };
    }
  });

export const getCardLinkChargeMode = createServerFn({ method: "GET" })
  .validator((token: string) => {
    if (!token) throw new Error("This link is missing a token.");
    return token;
  })
  .handler(async ({ data: token }) => {
    const sql = await getSql();
    const links = await sql<{ cleaner_user_id: string }>`
      select cleaner_user_id from card_links where token = ${token} limit 1
    `;
    if (!links[0]) throw new Error("This add-card link is invalid.");
    try {
      const lane = await cardChargeLane(sql, links[0].cleaner_user_id);
      return { mode: lane.lane };
    } catch {
      return { mode: "blocked" as const };
    }
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const rows = await sql.query<InvoiceWithClient>(
      `select ${INVOICE_SELECT}
       from invoices i
       join clients c on c.id = i.client_id
       left join jobs j on j.id = i.job_id
       where i.id = $1 limit 1`,
      [id],
    );
    const invoice = rows[0];
    if (!invoice) throw new Error("Receipt not found.");
    if (isOffice(actor) && invoice.cleaner_user_id !== masterUserId(actor)) throw new Error("Receipt not found.");
    if (actor.kind === "client" && invoice.client_id !== actor.client.id) throw new Error("Receipt not found.");
    return invoice;
  });
