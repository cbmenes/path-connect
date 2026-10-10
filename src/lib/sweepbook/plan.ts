import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "./access";
import { countBillableAdmins, extraAdminQuantity, includedAdminSeats, intervalTotalCents, monthlyTotalCents } from "./extra-admin";
import {
  fallbackPeriodEnd,
  paidPeriodEnded,
  parseBillingInterval,
  periodStillOpen,
  planCodeFromCents,
  planPriceCents,
  type BillingInterval,
  type SaasPlanCode,
  CREW_ANNUAL_PRICE_CENTS,
  CREW_PRICE_CENTS,
  EXTRA_ADMIN_ANNUAL_PRICE_CENTS,
  EXTRA_ADMIN_PRICE_CENTS,
  OFFICE_ANNUAL_PRICE_CENTS,
  OFFICE_PRICE_CENTS,
} from "./plan-prices";

export {
  CREW_ANNUAL_PRICE_CENTS,
  CREW_PRICE_CENTS,
  EXTRA_ADMIN_ANNUAL_PRICE_CENTS,
  EXTRA_ADMIN_PRICE_CENTS,
  OFFICE_ANNUAL_PRICE_CENTS,
  OFFICE_PRICE_CENTS,
  paidPeriodEnded,
  parseBillingInterval,
  periodStillOpen,
  planCodeFromCents,
  planPriceCents,
  type BillingInterval,
  type SaasPlanCode,
};

function parseCode(value: string): SaasPlanCode {
  if (value !== "crew" && value !== "office") throw new Error("Choose the Crew Plan or the Office Plan.");
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
    const interval: BillingInterval = actor.profile.billing_interval === "year" ? "year" : "month";
    const periodEnded = paidPeriodEnded({
      cancelAtPeriodEnd: actor.profile.cancel_at_period_end,
      periodEnd: actor.profile.current_period_end,
    });
    return {
      access: "master" as const,
      code,
      status: actor.profile.plan_status,
      interval,
      priceCents: planPriceCents(code, interval),
      demo,
      subscribed: Boolean(actor.profile.stripe_subscription_id) && !demo,
      stripeCustomer: Boolean(actor.profile.stripe_customer_id) && !demo,
      showConnect: !demo && actor.profile.plan_status === "active" && !periodEnded,
      connected: Boolean(actor.profile.stripe_account_id) && !demo,
      adminCount,
      includedAdmins: includedAdminSeats(code),
      extraAdmins,
      monthlyCents: monthlyTotalCents(code, extraAdmins),
      annualCents: intervalTotalCents(code, extraAdmins, "year"),
      periodEnd: actor.profile.current_period_end,
      cancelAtPeriodEnd: actor.profile.cancel_at_period_end && !periodEnded,
      periodEnded,
    };
  });

export const beginStripeConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { createOwnerConnectLink } = await import("./stripe.server");
    return createOwnerConnectLink(context.userId);
  });

export const openStripeAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { openOwnerStripeAccount } = await import("./stripe.server");
    return openOwnerStripeAccount(context.userId);
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
  .validator((input: { code: string; interval?: string }) => ({
    code: parseCode(input.code),
    interval: parseBillingInterval(input.interval),
  }))
  .handler(async ({ context, data }) => {
    const { createOwnerCheckout } = await import("./stripe.server");
    return createOwnerCheckout(context.userId, data.code, data.interval);
  });

export const changeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; interval?: string }) => ({
    code: parseCode(input.code),
    interval: parseBillingInterval(input.interval),
  }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireMaster(context.userId);
    if (actor.profile.plan_status === "canceled") throw new Error("Resume the plan before changing it.");
    if (
      paidPeriodEnded({
        cancelAtPeriodEnd: actor.profile.cancel_at_period_end,
        periodEnd: actor.profile.current_period_end,
      })
    ) {
      throw new Error("Resume the plan before changing it.");
    }
    const billing = await ownerUsesStripe(context.userId);
    if (billing.subscribed) {
      const { updateOwnerSubscription } = await import("./stripe.server");
      await updateOwnerSubscription(context.userId, data.code, data.interval);
      return { ok: true as const, code: data.code, interval: data.interval, pendingWebhook: false as const };
    }
    const cents = planPriceCents(data.code, data.interval);
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}, plan_code = ${data.code},
          billing_interval = ${data.interval}, cancel_at_period_end = ${false}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code: data.code, interval: data.interval, pendingWebhook: false as const };
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
    const interval: BillingInterval = actor.profile.billing_interval === "year" ? "year" : "month";
    const existingEnd = actor.profile.current_period_end;
    if (existingEnd && !periodStillOpen(existingEnd)) {
      await sql`
        update profiles
        set plan_status = ${"canceled"}, cancel_at_period_end = ${false}
        where user_id = ${context.userId}
      `;
      return { ok: true as const, pendingWebhook: false as const };
    }
    const periodEnd = periodStillOpen(existingEnd) ? existingEnd : fallbackPeriodEnd(interval);
    await sql`
      update profiles
      set plan_status = ${"active"},
          billing_interval = ${interval},
          cancel_at_period_end = ${true},
          current_period_end = ${periodEnd}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, pendingWebhook: false as const };
  });

export const resumeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { sql, actor } = await requireMaster(context.userId);
    const code = storedPlanCode(actor.profile);
    const interval: BillingInterval = actor.profile.billing_interval === "year" ? "year" : "month";
    const billing = await ownerUsesStripe(context.userId);
    const periodOpen = periodStillOpen(actor.profile.current_period_end);
    const renewalOff =
      actor.profile.cancel_at_period_end || actor.profile.plan_status === "canceled";
    if (!billing.demo && periodOpen && renewalOff && actor.profile.stripe_subscription_id) {
      try {
        const { resumeOwnerRenewal } = await import("./stripe.server");
        await resumeOwnerRenewal(context.userId);
        return { ok: true as const, code, url: null as string | null };
      } catch {
        /* The Stripe subscription is already gone. Checkout can start a new one. */
      }
    }
    if (!billing.demo && actor.profile.stripe_customer_id) {
      const { createOwnerCheckout } = await import("./stripe.server");
      const checkout = await createOwnerCheckout(context.userId, code, interval);
      return { ok: true as const, code, url: checkout.url };
    }
    const cents = planPriceCents(code, interval);
    const keptPeriodEnd = billing.demo ? null : actor.profile.current_period_end;
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}, plan_code = ${code},
          billing_interval = ${interval}, cancel_at_period_end = ${false},
          current_period_end = ${keptPeriodEnd}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code, url: null as string | null };
  });
