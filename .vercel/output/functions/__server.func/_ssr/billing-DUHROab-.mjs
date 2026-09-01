import { i as detectBrand, o as luhnOk } from "./card-utils-DAZ5YeNe.mjs";
import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, i as assertCleaner, l as getActor } from "./access-DwbveIs5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing-DUHROab-.js
var listBillingMethods_createServerFn_handler = createServerRpc({
	id: "f70560128e12b6ac5617d7ddc5f7d9b5d7fb4d8a9a281255ef55a721bcbb4a1c",
	name: "listBillingMethods",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => listBillingMethods.__executeServer(opts));
var listBillingMethods = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listBillingMethods_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	return {
		methods: await sql`
      select id, user_id, kind, brand, last4, exp_month, exp_year, holder_name, bank_name,
             is_default, created_at::text as created_at
      from billing_methods where user_id = ${context.userId}
      order by is_default desc, created_at desc
    `,
		planStatus: actor.profile.plan_status,
		planPriceCents: actor.profile.plan_price_cents || 1900
	};
});
var addBillingCard_createServerFn_handler = createServerRpc({
	id: "281df703822e9ee31606ed5cd4e355a2b35ac014e3ec398dac6c7e8af57dc100",
	name: "addBillingCard",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => addBillingCard.__executeServer(opts));
var addBillingCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addBillingCard_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const digits = data.number.replace(/\D/g, "");
	if (!luhnOk(digits)) throw new Error("That card number is not valid.");
	const brand = detectBrand(digits);
	const last4 = digits.slice(-4);
	const id = nid("bill");
	await sql`update billing_methods set is_default = false where user_id = ${context.userId}`;
	await sql`
      insert into billing_methods (
        id, user_id, kind, brand, last4, exp_month, exp_year, holder_name, is_default
      ) values (
        ${id}, ${context.userId}, ${"card"}, ${brand}, ${last4}, ${data.expMonth}, ${data.expYear},
        ${data.holderName || null}, ${true}
      )
    `;
	return {
		id,
		brand,
		last4
	};
});
var addBillingAch_createServerFn_handler = createServerRpc({
	id: "31d802ea317f1d46efb704ce816601afa8c1fb2cdc0653c55765b16cf75c1a65",
	name: "addBillingAch",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => addBillingAch.__executeServer(opts));
var addBillingAch = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addBillingAch_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const routing = data.routing.replace(/\D/g, "");
	const account = data.account.replace(/\D/g, "");
	if (routing.length !== 9) throw new Error("Routing number should be 9 digits.");
	if (account.length < 4) throw new Error("Enter a bank account number.");
	const last4 = account.slice(-4);
	const id = nid("bill");
	await sql`update billing_methods set is_default = false where user_id = ${context.userId}`;
	await sql`
      insert into billing_methods (
        id, user_id, kind, brand, last4, holder_name, bank_name, is_default
      ) values (
        ${id}, ${context.userId}, ${"ach"}, ${"bank"}, ${last4}, ${data.holderName || null},
        ${data.bankName?.trim() || "Bank account"}, ${true}
      )
    `;
	return {
		id,
		last4
	};
});
var setDefaultBillingMethod_createServerFn_handler = createServerRpc({
	id: "a9ed382a5a9057d4a131137b0586f40440842b3fd006a2006f8da53b3edcb6e1",
	name: "setDefaultBillingMethod",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => setDefaultBillingMethod.__executeServer(opts));
var setDefaultBillingMethod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(setDefaultBillingMethod_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	await sql`update billing_methods set is_default = false where user_id = ${context.userId}`;
	await sql`
      update billing_methods set is_default = true
      where id = ${id} and user_id = ${context.userId}
    `;
	return { ok: true };
});
var removeBillingMethod_createServerFn_handler = createServerRpc({
	id: "a54bfb6b4ea534126dcfd1a5cfba7267e5b1132570ac005f72b5d5cecb9167e5",
	name: "removeBillingMethod",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => removeBillingMethod.__executeServer(opts));
var removeBillingMethod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(removeBillingMethod_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	await sql`delete from billing_methods where id = ${id} and user_id = ${context.userId}`;
	const leftover = await sql`
      select id from billing_methods where user_id = ${context.userId} order by created_at desc limit 1
    `;
	if (leftover[0]) await sql`update billing_methods set is_default = true where id = ${leftover[0].id}`;
	return { ok: true };
});
var updateAccount_createServerFn_handler = createServerRpc({
	id: "94087c886f051e18fe824cb55e7aabd7a2103b727f2259527a386d4b168b6d3b",
	name: "updateAccount",
	filename: "src/lib/sweepbook/billing.ts"
}, (opts) => updateAccount.__executeServer(opts));
var updateAccount = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const email = input.email.trim().toLowerCase();
	if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
	return { email };
}).handler(updateAccount_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	if ((await sql`
      select id from "user" where email = ${data.email} and id <> ${context.userId} limit 1
    `)[0]) throw new Error("That email is already in use.");
	await sql`update "user" set email = ${data.email} where id = ${context.userId}`;
	await sql`update profiles set email = ${data.email} where user_id = ${context.userId}`;
	return { ok: true };
});
//#endregion
export { addBillingAch_createServerFn_handler, addBillingCard_createServerFn_handler, listBillingMethods_createServerFn_handler, removeBillingMethod_createServerFn_handler, setDefaultBillingMethod_createServerFn_handler, updateAccount_createServerFn_handler };
