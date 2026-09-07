import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCanCharge, assertClient, canChargeClients, getActor, isOffice, masterUserId } from "./access";
import { ensureDemoSeed } from "./seed";
import { detectBrand, luhnOk } from "./card-utils";
import { nid, formatDateTime, money } from "./time";
import { insertNotification } from "./notifications";
import type { CardRow, InvoiceWithClient } from "./types";

function receiptNo() {
  return `SB-${Math.floor(100000 + Math.random() * 900000)}`;
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

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const actor = await getActor(sql, context.userId);
    if (isOffice(actor)) {
      return sql.query<InvoiceWithClient>(
        `select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name,
                j.start_at::text as job_start_at
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
        `select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name,
                j.start_at::text as job_start_at
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
    const ownerId = masterUserId(actor);
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

export const recordOutsidePayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { invoiceId?: string; clientId: string; amountCents: number; description: string; method: "cash" | "venmo" | "outside"; jobId?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCanCharge(actor);
    const ownerId = masterUserId(actor);
    const rec = receiptNo();
    if (data.invoiceId) {
      const existing = await sql<{ id: string; status: string }>`
        select id, status from invoices
        where id = ${data.invoiceId} and cleaner_user_id = ${ownerId}
        limit 1
      `;
      if (!existing[0]) throw new Error("Invoice not found.");
      await sql`
        update invoices
        set status = 'paid', method = ${data.method}, paid_at = now(), receipt_number = ${rec},
            failure_reason = null
        where id = ${data.invoiceId} and cleaner_user_id = ${ownerId}
      `;
      const linked = await sql<{ job_id: string | null; kind: string }>`
        select job_id, kind from invoices where id = ${data.invoiceId} limit 1
      `;
      if (linked[0]?.job_id && linked[0].kind === "visit") {
        await sql`update jobs set status = 'completed' where id = ${linked[0].job_id} and cleaner_user_id = ${ownerId}`;
      }
      return { ok: true, receiptNumber: rec, invoiceId: data.invoiceId };
    }
    if (data.jobId) {
      const existing = await sql<{ id: string }>`
        select id from invoices
        where job_id = ${data.jobId} and kind = 'visit' and cleaner_user_id = ${ownerId}
        limit 1
      `;
      if (existing[0]) {
        await sql`
          update invoices
          set status = 'paid', method = ${data.method}, paid_at = now(), receipt_number = ${rec},
              amount_cents = ${data.amountCents}, description = ${data.description}, failure_reason = null
          where id = ${existing[0].id}
        `;
        await sql`update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${ownerId}`;
        return { ok: true, receiptNumber: rec, invoiceId: existing[0].id };
      }
    }
    const id = nid("inv");
    await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status, method, kind, paid_at, receipt_number
      ) values (
        ${id}, ${ownerId}, ${data.clientId}, ${data.jobId ?? null}, ${data.amountCents},
        ${data.description}, ${"paid"}, ${data.method}, ${"visit"}, ${new Date().toISOString()}, ${rec}
      )
    `;
    if (data.jobId) {
      await sql`update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${ownerId}`;
    }
    return { ok: true, receiptNumber: rec, invoiceId: id };
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
    await sql`
      update jobs set tip_requested = true
      where id = ${jobId} and cleaner_user_id = ${masterUserId(actor)} and status = 'completed'
    `;
    return { ok: true };
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const rows = await sql.query<InvoiceWithClient>(
      `select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
              i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
              i.receipt_number, i.created_at::text as created_at, c.name as client_name,
              j.start_at::text as job_start_at
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
