import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCleaner, getActor } from "./access";
import { detectBrand, luhnOk } from "./card-utils";
import { nid } from "./time";
import type { BillingMethod, PlanStatus } from "./types";

export const listBillingMethods = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    const methods = await sql<BillingMethod>`
      select id, user_id, kind, brand, last4, exp_month, exp_year, holder_name, bank_name,
             is_default, created_at::text as created_at
      from billing_methods where user_id = ${context.userId}
      order by is_default desc, created_at desc
    `;
    return {
      methods,
      planStatus: actor.profile.plan_status as PlanStatus,
      planPriceCents: actor.profile.plan_price_cents || 1900,
    };
  });

export const addBillingCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { number: string; expMonth: number; expYear: number; holderName: string }) => input)
  .handler(async ({ context, data }) => {
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
    return { id, brand, last4 };
  });

export const addBillingAch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { routing: string; account: string; holderName: string; bankName?: string }) => input)
  .handler(async ({ context, data }) => {
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
    return { id, last4 };
  });

export const setDefaultBillingMethod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
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

export const removeBillingMethod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    await sql`delete from billing_methods where id = ${id} and user_id = ${context.userId}`;
    const leftover = await sql<{ id: string }>`
      select id from billing_methods where user_id = ${context.userId} order by created_at desc limit 1
    `;
    if (leftover[0]) {
      await sql`update billing_methods set is_default = true where id = ${leftover[0].id}`;
    }
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
    return { email };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const taken = await sql<{ id: string }>`
      select id from "user" where email = ${data.email} and id <> ${context.userId} limit 1
    `;
    if (taken[0]) throw new Error("That email is already in use.");
    await sql`update "user" set email = ${data.email} where id = ${context.userId}`;
    await sql`update profiles set email = ${data.email} where user_id = ${context.userId}`;
    return { ok: true };
  });
