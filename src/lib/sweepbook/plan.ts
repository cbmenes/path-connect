import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "./access";
import { countBillableAdmins, extraAdminQuantity, includedAdminSeats, monthlyTotalCents } from "./extra-admin";
import {
  planCodeFromCents,
  planPriceCents,
  type SaasPlanCode,
  CREW_PRICE_CENTS,
  EXTRA_ADMIN_PRICE_CENTS,
  OFFICE_PRICE_CENTS,
} from "./plan-prices";

export {
  CREW_PRICE_CENTS,
  EXTRA_ADMIN_PRICE_CENTS,
  OFFICE_PRICE_CENTS,
  planCodeFromCents,
  planPriceCents,
  type SaasPlanCode,
};

function parseCode(value: string): SaasPlanCode {
  if (value !== "crew" && value !== "office") throw new Error("Choose Crew or Office.");
  return value;
}

function storedPlanCode(profile: { plan_code: "crew" | "office" | null; plan_price_cents: number }): SaasPlanCode {
  if (profile.plan_code === "crew" || profile.plan_code === "office") return profile.plan_code;
  return planCodeFromCents(profile.plan_price_cents);
}

async function requireMaster(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  return { sql, actor };
}

async function ownerUsesStripe(userId: string) {
  const { actor } = await requireMaster(userId);
  const { isDemoEmail } = await import("./stripe.server");
  const sql = await getSql();
  const rows = await sql<{ email: string | null }>`select email from "user" where id = ${userId} limit 1`;
  const demo = isDemoEmail(rows[0]?.email);
  return {
    actor,
    demo,
    subscribed: Boolean(actor.profile.stripe_subscription_id) && !demo,
  };
}

export const getSaasPlan = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "admin") return { access: "locked" as const };
    if (actor.kind !== "cleaner") return { access: "hidden" as const };
    const code = storedPlanCode(actor.profile);
    const { isDemoEmail } = await import("./stripe.server");
    const rows = await sql<{ email: string | null }>`select email from "user" where id = ${context.userId} limit 1`;
    const demo = isDemoEmail(rows[0]?.email);
    const adminCount = await countBillableAdmins(sql, context.userId);
    const extraAdmins = extraAdminQuantity(adminCount, code);
    return {
      access: "master" as const,
      code,
      status: actor.profile.plan_status,
      priceCents: actor.profile.plan_status === "trial" ? planPriceCents(code) : actor.profile.plan_price_cents,
      demo,
      subscribed: Boolean(actor.profile.stripe_subscription_id) && !demo,
      stripeCustomer: Boolean(actor.profile.stripe_customer_id) && !demo,
      adminCount,
      includedAdmins: includedAdminSeats(code),
      extraAdmins,
      monthlyCents: monthlyTotalCents(code, extraAdmins),
    };
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { createOwnerBillingPortal } = await import("./stripe.server");
    return createOwnerBillingPortal(context.userId);
  });

export const beginStripeCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: parseCode(input.code) }))
  .handler(async ({ context, data }) => {
    const { createOwnerCheckout } = await import("./stripe.server");
    return createOwnerCheckout(context.userId, data.code);
  });

export const changeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: parseCode(input.code) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireMaster(context.userId);
    if (actor.profile.plan_status === "canceled") throw new Error("Resume the plan before changing it.");
    const billing = await ownerUsesStripe(context.userId);
    if (billing.subscribed) {
      const { updateOwnerSubscription } = await import("./stripe.server");
      await updateOwnerSubscription(context.userId, data.code);
      return { ok: true as const, code: data.code, pendingWebhook: true as const };
    }
    const cents = planPriceCents(data.code);
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}, plan_code = ${data.code}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code: data.code, pendingWebhook: false as const };
  });

export const cancelSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { sql, actor } = await requireMaster(context.userId);
    if (actor.profile.plan_status !== "active") throw new Error("Only an active plan can be canceled.");
    const billing = await ownerUsesStripe(context.userId);
    if (billing.subscribed) {
      const { cancelOwnerSubscription } = await import("./stripe.server");
      await cancelOwnerSubscription(context.userId);
      return { ok: true as const, pendingWebhook: true as const };
    }
    await sql`
      update profiles set plan_status = ${"canceled"} where user_id = ${context.userId}
    `;
    return { ok: true as const, pendingWebhook: false as const };
  });

export const resumeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { sql, actor } = await requireMaster(context.userId);
    const code = storedPlanCode(actor.profile);
    const billing = await ownerUsesStripe(context.userId);
    if (!billing.demo && actor.profile.stripe_customer_id) {
      const { createOwnerCheckout } = await import("./stripe.server");
      const checkout = await createOwnerCheckout(context.userId, code);
      return { ok: true as const, code, url: checkout.url };
    }
    const cents = planPriceCents(code);
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}, plan_code = ${code}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code, url: null as string | null };
  });
