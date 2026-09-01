import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { c as createServerRpc, l as getActor } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bootstrap-DqBfo1vX.js
var bootstrapDemo_createServerFn_handler = createServerRpc({
	id: "71c010ecc10192e2540eb3851c3bc1b35fd2880b6edcccf28bcdf47966e98a0c",
	name: "bootstrapDemo",
	filename: "src/lib/sweepbook/bootstrap.ts"
}, (opts) => bootstrapDemo.__executeServer(opts));
var bootstrapDemo = createServerFn({ method: "GET" }).handler(bootstrapDemo_createServerFn_handler, async () => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	return { ok: true };
});
var getMyActor_createServerFn_handler = createServerRpc({
	id: "0c5aa3ba80fcc73a7374ab0c37d6c746be0e2938249b9c18b0b37a4031bf8a7c",
	name: "getMyActor",
	filename: "src/lib/sweepbook/bootstrap.ts"
}, (opts) => getMyActor.__executeServer(opts));
var getMyActor = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getMyActor_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	return getActor(sql, context.userId);
});
var completeOnboarding_createServerFn_handler = createServerRpc({
	id: "f091207823c1036e7288e32d4485716203db3f9c2daad0f6b807a6ae7912e4f0",
	name: "completeOnboarding",
	filename: "src/lib/sweepbook/bootstrap.ts"
}, (opts) => completeOnboarding.__executeServer(opts));
var completeOnboarding = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const fullName = input.fullName.trim();
	if (!fullName) throw new Error("Name is required.");
	if (input.role !== "cleaner" && input.role !== "client") throw new Error("Choose a role.");
	return {
		role: input.role,
		fullName,
		businessName: input.businessName?.trim() || null
	};
}).handler(completeOnboarding_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	if ((await sql`select user_id from profiles where user_id = ${context.userId} limit 1`).length) return { ok: true };
	const policy = data.role === "cleaner" ? "Cancellations made less than 24 hours before a visit may be charged half the scheduled rate." : null;
	await sql`
      insert into profiles (
        user_id, role, full_name, business_name, cancellation_policy,
        default_duration_min, default_rate_cents, cleaner_kind, email, plan_status, plan_price_cents
      ) values (
        ${context.userId}, ${data.role}, ${data.fullName}, ${data.businessName},
        ${policy}, ${120}, ${15e3}, ${data.role === "cleaner" ? "master" : null},
        ${null}, ${data.role === "cleaner" ? "trial" : "trial"}, ${1900}
      )
    `;
	return { ok: true };
});
//#endregion
export { bootstrapDemo_createServerFn_handler, completeOnboarding_createServerFn_handler, getMyActor_createServerFn_handler };
