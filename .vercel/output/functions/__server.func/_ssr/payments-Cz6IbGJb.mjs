import { i as detectBrand, o as luhnOk } from "./card-utils-DAZ5YeNe.mjs";
import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { a as assertClient, c as createServerRpc, i as assertCleaner, l as getActor } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/payments-Cz6IbGJb.js
function receiptNo() {
	return `SB-${Math.floor(1e5 + Math.random() * 9e5)}`;
}
function pickChargeCard(cards, cardId) {
	if (cardId) return cards.find((c) => c.id === cardId) ?? cards.find((c) => c.is_default) ?? cards[0];
	const preferred = cards.find((c) => c.is_default);
	const clientDefault = cards.find((c) => c.source === "client" && c.is_default) ?? cards.find((c) => c.source === "client");
	const backup = cards.find((c) => c.source === "cleaner" && c.is_default) ?? cards.find((c) => c.source === "cleaner");
	return preferred ?? clientDefault ?? backup ?? cards[0];
}
var listInvoices_createServerFn_handler = createServerRpc({
	id: "2b70ade7ba581deeee7f630de77a4db75df59501bd927ca91970079a25193afa",
	name: "listInvoices",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => listInvoices.__executeServer(opts));
var listInvoices = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listInvoices_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") return sql.query(`select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name
         from invoices i join clients c on c.id = i.client_id
         where i.cleaner_user_id = $1
         order by i.created_at desc
         limit 80`, [context.userId]);
	if (actor.kind === "client") return sql.query(`select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
                i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
                i.receipt_number, i.created_at::text as created_at, c.name as client_name
         from invoices i join clients c on c.id = i.client_id
         where i.client_id = $1
         order by i.created_at desc
         limit 80`, [actor.client.id]);
	return [];
});
var listCardsForClient_createServerFn_handler = createServerRpc({
	id: "fbcdff9c938774863b97fecb4b65f323b0efb1c3484210d3950c49aad027f013",
	name: "listCardsForClient",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => listCardsForClient.__executeServer(opts));
var listCardsForClient = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(listCardsForClient_createServerFn_handler, async ({ context, data: clientId }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") return sql`
        select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
               holder_name, source, is_default, failing, created_at::text as created_at
        from payment_cards
        where client_id = ${clientId} and cleaner_user_id = ${context.userId}
        order by is_default desc, created_at desc
      `;
	if (actor.kind === "client" && actor.client.id === clientId) return sql`
        select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
               holder_name, source, is_default, failing, created_at::text as created_at
        from payment_cards
        where client_id = ${clientId}
        order by is_default desc, created_at desc
      `;
	throw new Error("Not found.");
});
async function saveCard(sql, args) {
	const digits = args.number.replace(/\D/g, "");
	if (!luhnOk(digits)) throw new Error("That card number is not valid.");
	const brand = detectBrand(digits);
	const last4 = digits.slice(-4);
	const failing = digits === "4000000000000002" || last4 === "0002";
	const isDefault = (await sql`
    select id from payment_cards
    where client_id = ${args.clientId} and cleaner_user_id = ${args.cleanerUserId}
  `).length === 0 || args.source === "client";
	if (isDefault) await sql`
      update payment_cards set is_default = false
      where client_id = ${args.clientId} and cleaner_user_id = ${args.cleanerUserId}
    `;
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
	return {
		id,
		brand,
		last4,
		failing
	};
}
var addCardAuthenticated_createServerFn_handler = createServerRpc({
	id: "ae1b17af7c6f9b0e401b84f671af1b45608061da26470bcca9f5c3519adea8fd",
	name: "addCardAuthenticated",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => addCardAuthenticated.__executeServer(opts));
var addCardAuthenticated = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addCardAuthenticated_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") {
		if (!data.clientId) throw new Error("Choose a client.");
		if (!(await sql`select id from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1`)[0]) throw new Error("Client not found.");
		return saveCard(sql, {
			cleanerUserId: context.userId,
			clientId: data.clientId,
			number: data.number,
			expMonth: data.expMonth,
			expYear: data.expYear,
			holderName: data.holderName,
			source: "cleaner"
		});
	}
	if (actor.kind === "client") return saveCard(sql, {
		cleanerUserId: actor.client.cleaner_user_id,
		clientId: actor.client.id,
		number: data.number,
		expMonth: data.expMonth,
		expYear: data.expYear,
		holderName: data.holderName,
		source: "client"
	});
	throw new Error("Sign in to add a card.");
});
var addCardByToken_createServerFn_handler = createServerRpc({
	id: "00f385d795b67101bb18ee241c8acb548542f6cf33f69ea052262dec9dcb75d2",
	name: "addCardByToken",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => addCardByToken.__executeServer(opts));
var addCardByToken = createServerFn({ method: "POST" }).validator((input) => input).handler(addCardByToken_createServerFn_handler, async ({ data }) => {
	if (!data.token) throw new Error("This link is missing a token.");
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const link = (await sql`
      select cleaner_user_id, client_id, used_at::text as used_at
      from card_links where token = ${data.token} limit 1
    `)[0];
	if (!link) throw new Error("This add-card link is invalid.");
	const saved = await saveCard(sql, {
		cleanerUserId: link.cleaner_user_id,
		clientId: link.client_id,
		number: data.number,
		expMonth: data.expMonth,
		expYear: data.expYear,
		holderName: data.holderName,
		source: "client"
	});
	await sql`update card_links set used_at = now() where token = ${data.token}`;
	return saved;
});
var createCardLink_createServerFn_handler = createServerRpc({
	id: "f06f7c58bcbf29e1a7a3851ee007c622051f3ef850e6981773ddd83c807b6702",
	name: "createCardLink",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => createCardLink.__executeServer(opts));
var createCardLink = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createCardLink_createServerFn_handler, async ({ context, data: clientId }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	if (!(await sql`select id, name from clients where id = ${clientId} and cleaner_user_id = ${context.userId} limit 1`)[0]) throw new Error("Client not found.");
	const token = nid("cardlink").replace(/-/g, "").slice(0, 22);
	await sql`
      insert into card_links (id, token, cleaner_user_id, client_id)
      values (${nid("clink")}, ${token}, ${context.userId}, ${clientId})
    `;
	return {
		token,
		path: `/add-card/${token}`
	};
});
var setDefaultCard_createServerFn_handler = createServerRpc({
	id: "b14696251ac629cc3ffff9345fd4f0e93a25a744a35914d43c92672977a89d4f",
	name: "setDefaultCard",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => setDefaultCard.__executeServer(opts));
var setDefaultCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(setDefaultCard_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	const owner = actor.kind === "cleaner" ? context.userId : actor.kind === "client" && actor.client.id === data.clientId ? actor.client.cleaner_user_id : null;
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
var removeCard_createServerFn_handler = createServerRpc({
	id: "a6a18c51a4b1e0ef8df6b5ca5c1274a1ab32c63df5d8b5b85711893a84c80fde",
	name: "removeCard",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => removeCard.__executeServer(opts));
var removeCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(removeCard_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	const owner = actor.kind === "cleaner" ? context.userId : actor.kind === "client" && actor.client.id === data.clientId ? actor.client.cleaner_user_id : null;
	if (!owner) throw new Error("Not found.");
	const row = await sql`
      select is_default from payment_cards
      where id = ${data.cardId} and client_id = ${data.clientId} and cleaner_user_id = ${owner} limit 1
    `;
	if (!row[0]) throw new Error("Card not found.");
	await sql`
      delete from payment_cards
      where id = ${data.cardId} and client_id = ${data.clientId} and cleaner_user_id = ${owner}
    `;
	if (row[0].is_default) {
		const next = await sql`
        select id from payment_cards
        where client_id = ${data.clientId} and cleaner_user_id = ${owner}
        order by created_at desc limit 1
      `;
		if (next[0]) await sql`update payment_cards set is_default = true where id = ${next[0].id}`;
	}
	return { ok: true };
});
var chargeCard_createServerFn_handler = createServerRpc({
	id: "0238a4bf7772f69aa40e56a605241d90a5fc2481d1b0541c25e313db6bbd8ded",
	name: "chargeCard",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => chargeCard.__executeServer(opts));
var chargeCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input.clientId) throw new Error("Choose a client.");
	if (!input.amountCents || input.amountCents < 50) throw new Error("Amount must be at least $0.50.");
	if (!input.description.trim()) throw new Error("Add a description.");
	return {
		...input,
		description: input.description.trim(),
		kind: input.kind ?? "visit"
	};
}).handler(chargeCard_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	if (!(await sql`select id, name from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1`)[0]) throw new Error("Client not found.");
	const card = pickChargeCard(await sql`
      select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
             holder_name, source, is_default, failing, created_at::text as created_at
      from payment_cards
      where client_id = ${data.clientId} and cleaner_user_id = ${context.userId}
    `, data.cardId);
	if (!card) throw new Error("No card on file. Send an add-card link or collect one on site.");
	const failed = card.failing;
	const rec = failed ? null : receiptNo();
	let existing;
	if (data.jobId && data.kind === "visit") existing = (await sql`
        select id, status from invoices
        where job_id = ${data.jobId} and kind = 'visit' and cleaner_user_id = ${context.userId}
        limit 1
      `)[0];
	if (existing) await sql`
        update invoices set
          amount_cents = ${data.amountCents},
          description = ${data.description},
          status = ${failed ? "unpaid" : "paid"},
          method = ${"card"},
          kind = ${data.kind},
          paid_at = ${failed ? null : (/* @__PURE__ */ new Date()).toISOString()},
          failure_reason = ${failed ? "Card declined — the issuer did not authorize this charge." : null},
          receipt_number = ${rec}
        where id = ${existing.id}
      `;
	else {
		const id = nid("inv");
		await sql`
        insert into invoices (
          id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
          method, kind, paid_at, failure_reason, receipt_number
        ) values (
          ${id}, ${context.userId}, ${data.clientId}, ${data.jobId ?? null}, ${data.amountCents},
          ${data.description}, ${failed ? "unpaid" : "paid"}, ${"card"}, ${data.kind},
          ${failed ? null : (/* @__PURE__ */ new Date()).toISOString()},
          ${failed ? "Card declined — the issuer did not authorize this charge." : null},
          ${rec}
        )
      `;
		existing = {
			id,
			status: failed ? "unpaid" : "paid"
		};
	}
	if (failed) return {
		ok: false,
		invoiceId: existing.id,
		reason: "Card declined. Ask the client to update their card.",
		brand: card.brand,
		last4: card.last4
	};
	if (data.kind === "tip" && data.jobId) await sql`
        update jobs set tip_cents = tip_cents + ${data.amountCents}, tip_requested = false
        where id = ${data.jobId} and cleaner_user_id = ${context.userId}
      `;
	if (data.kind === "visit" && data.jobId) await sql`
        update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${context.userId}
      `;
	return {
		ok: true,
		invoiceId: existing.id,
		receiptNumber: rec,
		amountCents: data.amountCents,
		description: data.description,
		brand: card.brand,
		last4: card.last4
	};
});
var recordOutsidePayment_createServerFn_handler = createServerRpc({
	id: "26d4f9c5a617a574f4ca139877d447e7d9edba1792cecd6198eb19db7039c49d",
	name: "recordOutsidePayment",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => recordOutsidePayment.__executeServer(opts));
var recordOutsidePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(recordOutsidePayment_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const rec = receiptNo();
	if (data.invoiceId) {
		await sql`
        update invoices
        set status = 'paid', method = ${data.method}, paid_at = now(), receipt_number = ${rec}
        where id = ${data.invoiceId} and cleaner_user_id = ${context.userId}
      `;
		const linked = await sql`
        select job_id, kind from invoices where id = ${data.invoiceId} limit 1
      `;
		if (linked[0]?.job_id && linked[0].kind === "visit") await sql`update jobs set status = 'completed' where id = ${linked[0].job_id} and cleaner_user_id = ${context.userId}`;
		return {
			ok: true,
			receiptNumber: rec,
			invoiceId: data.invoiceId
		};
	}
	if (data.jobId) {
		const existing = await sql`
        select id from invoices
        where job_id = ${data.jobId} and kind = 'visit' and cleaner_user_id = ${context.userId}
        limit 1
      `;
		if (existing[0]) {
			await sql`
          update invoices
          set status = 'paid', method = ${data.method}, paid_at = now(), receipt_number = ${rec},
              amount_cents = ${data.amountCents}, description = ${data.description}, failure_reason = null
          where id = ${existing[0].id}
        `;
			await sql`update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${context.userId}`;
			return {
				ok: true,
				receiptNumber: rec,
				invoiceId: existing[0].id
			};
		}
	}
	const id = nid("inv");
	await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status, method, kind, paid_at, receipt_number
      ) values (
        ${id}, ${context.userId}, ${data.clientId}, ${data.jobId ?? null}, ${data.amountCents},
        ${data.description}, ${"paid"}, ${data.method}, ${"visit"}, ${(/* @__PURE__ */ new Date()).toISOString()}, ${rec}
      )
    `;
	if (data.jobId) await sql`update jobs set status = 'completed' where id = ${data.jobId} and cleaner_user_id = ${context.userId}`;
	return {
		ok: true,
		receiptNumber: rec,
		invoiceId: id
	};
});
var payInvoiceAsClient_createServerFn_handler = createServerRpc({
	id: "491eef709878298caa79594c6137ec47235170a4f62e248f494d8e22bc011113",
	name: "payInvoiceAsClient",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => payInvoiceAsClient.__executeServer(opts));
var payInvoiceAsClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(payInvoiceAsClient_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertClient(actor);
	const invoice = (await sql`
      select id, amount_cents, description, status, client_id, job_id, kind
      from invoices where id = ${data.invoiceId} and client_id = ${actor.client.id} limit 1
    `)[0];
	if (!invoice) throw new Error("Invoice not found.");
	const card = pickChargeCard(await sql`
      select id, brand, last4, source, is_default, failing from payment_cards
      where client_id = ${actor.client.id}
    `, data.cardId);
	if (!card) throw new Error("Add a card to pay.");
	if (card.failing) {
		await sql`
        update invoices set status = 'failed', method = 'card',
          failure_reason = 'Card declined — please update your card.'
        where id = ${invoice.id}
      `;
		return {
			ok: false,
			reason: "Card declined. Update your card and try again.",
			needsCard: true
		};
	}
	const rec = receiptNo();
	await sql`
      update invoices set status = 'paid', method = 'card', paid_at = now(),
        receipt_number = ${rec}, failure_reason = null
      where id = ${invoice.id} and client_id = ${actor.client.id}
    `;
	if (invoice.job_id && invoice.kind === "visit") await sql`update jobs set status = 'completed' where id = ${invoice.job_id}`;
	return {
		ok: true,
		receiptNumber: rec,
		amountCents: invoice.amount_cents,
		description: invoice.description,
		brand: card.brand,
		last4: card.last4
	};
});
var tipJob_createServerFn_handler = createServerRpc({
	id: "77e6048c073c2b795d14af108f125a0eccbf0949476acbf03b23576a6a8633ad",
	name: "tipJob",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => tipJob.__executeServer(opts));
var tipJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(tipJob_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertClient(actor);
	if (data.amountCents < 100) throw new Error("Tips must be at least $1.");
	const job = (await sql`
      select id, service, status from jobs
      where id = ${data.jobId} and client_id = ${actor.client.id} limit 1
    `)[0];
	if (!job || job.status !== "completed") throw new Error("Tips are available after a completed visit.");
	const card = pickChargeCard(await sql`
      select id, brand, last4, source, is_default, failing from payment_cards
      where client_id = ${actor.client.id}
    `, data.cardId);
	if (!card) throw new Error("Add a card to send a tip.");
	if (card.failing) return {
		ok: false,
		reason: "Card declined. Update your card and try again.",
		needsCard: true
	};
	const rec = receiptNo();
	await sql`
      insert into invoices (
        id, cleaner_user_id, client_id, job_id, amount_cents, description, status, method, kind, paid_at, receipt_number
      ) values (
        ${nid("inv")}, ${actor.client.cleaner_user_id}, ${actor.client.id}, ${job.id}, ${data.amountCents},
        ${`Tip — ${job.service}`}, ${"paid"}, ${"card"}, ${"tip"}, ${(/* @__PURE__ */ new Date()).toISOString()}, ${rec}
      )
    `;
	await sql`
      update jobs set tip_cents = tip_cents + ${data.amountCents}, tip_requested = false
      where id = ${job.id}
    `;
	return {
		ok: true,
		receiptNumber: rec,
		amountCents: data.amountCents,
		brand: card.brand,
		last4: card.last4
	};
});
var requestTip_createServerFn_handler = createServerRpc({
	id: "bd1b76b461af7c475ce155d47458dd170b93d8e1e46c31d6dc40d01e59c21016",
	name: "requestTip",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => requestTip.__executeServer(opts));
var requestTip = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((jobId) => jobId).handler(requestTip_createServerFn_handler, async ({ context, data: jobId }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	await sql`
      update jobs set tip_requested = true
      where id = ${jobId} and cleaner_user_id = ${context.userId} and status = 'completed'
    `;
	return { ok: true };
});
var getInvoice_createServerFn_handler = createServerRpc({
	id: "9036b0bea769646796121952b4459e588628b7893c4b7a4a64c066b414dcc2e0",
	name: "getInvoice",
	filename: "src/lib/sweepbook/payments.ts"
}, (opts) => getInvoice.__executeServer(opts));
var getInvoice = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(getInvoice_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	const invoice = (await sql.query(`select i.id, i.cleaner_user_id, i.client_id, i.job_id, i.amount_cents, i.description,
              i.status, i.method, i.kind, i.paid_at::text as paid_at, i.failure_reason,
              i.receipt_number, i.created_at::text as created_at, c.name as client_name
       from invoices i join clients c on c.id = i.client_id
       where i.id = $1 limit 1`, [id]))[0];
	if (!invoice) throw new Error("Receipt not found.");
	if (actor.kind === "cleaner" && invoice.cleaner_user_id !== context.userId) throw new Error("Receipt not found.");
	if (actor.kind === "client" && invoice.client_id !== actor.client.id) throw new Error("Receipt not found.");
	return invoice;
});
//#endregion
export { addCardAuthenticated_createServerFn_handler, addCardByToken_createServerFn_handler, chargeCard_createServerFn_handler, createCardLink_createServerFn_handler, getInvoice_createServerFn_handler, listCardsForClient_createServerFn_handler, listInvoices_createServerFn_handler, payInvoiceAsClient_createServerFn_handler, recordOutsidePayment_createServerFn_handler, removeCard_createServerFn_handler, requestTip_createServerFn_handler, setDefaultCard_createServerFn_handler, tipJob_createServerFn_handler };
