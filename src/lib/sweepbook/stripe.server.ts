import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { getSql, type Sql } from "../db";
import { getActor } from "./access";
import { countBillableAdmins, extraAdminItemChanges, extraAdminQuantity } from "./extra-admin";
import { planCodeFromCents, planPriceCents, type SaasPlanCode } from "./plan-prices";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_CLEANER_EMAIL,
  DEMO_CLIENT_EMAIL,
  DEMO_TEAM2_EMAIL,
  DEMO_TEAM_EMAIL,
} from "./types";

const DEMO_EMAILS = new Set(
  [DEMO_CLEANER_EMAIL, DEMO_CLIENT_EMAIL, DEMO_TEAM_EMAIL, DEMO_TEAM2_EMAIL, DEMO_ADMIN_EMAIL].map((email) =>
    email.toLowerCase(),
  ),
);

const CHECKOUT_ORIGINS = new Set([
  "https://getcrewweek.com",
  "https://www.getcrewweek.com",
  "https://crewweek.app",
  "https://www.crewweek.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

export function isDemoEmail(email: string | null | undefined) {
  return DEMO_EMAILS.has((email || "").trim().toLowerCase());
}

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value || "";
}

export function stripeSecretKey() {
  const key = envValue("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe is not configured.");
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("A Stripe test secret key is required.");
  }
  return key;
}

function webhookSecret() {
  const secret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  return secret;
}

export function priceIdForPlan(plan: SaasPlanCode) {
  const id = plan === "office" ? envValue("STRIPE_PRICE_OFFICE") : envValue("STRIPE_PRICE_CREW");
  if (!id.startsWith("price_")) throw new Error("Stripe price is not configured.");
  return id;
}

export function planFromPriceId(priceId: string | null | undefined): SaasPlanCode | null {
  if (!priceId) return null;
  if (priceId === envValue("STRIPE_PRICE_CREW")) return "crew";
  if (priceId === envValue("STRIPE_PRICE_OFFICE")) return "office";
  return null;
}

function extraAdminPriceId() {
  const id = envValue("STRIPE_PRICE_EXTRA_ADMIN");
  if (!id.startsWith("price_")) throw new Error("Stripe price is not configured.");
  return id;
}

function configuredExtraAdminPriceId() {
  const id = envValue("STRIPE_PRICE_EXTRA_ADMIN");
  return id.startsWith("price_") ? id : "";
}

function basePlanItem(subscription: Stripe.Subscription) {
  for (const item of subscription.items?.data ?? []) {
    const plan = planFromPriceId(item.price?.id);
    if (plan) return { item, plan };
  }
  return null;
}

function listedSubscriptionItems(subscription: Stripe.Subscription) {
  return (subscription.items?.data ?? []).map((item) => ({
    id: item.id,
    priceId: item.price?.id || "",
    quantity: item.quantity ?? 1,
  }));
}

function stripeClient() {
  return new Stripe(stripeSecretKey());
}

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function userEmail(sql: Sql, userId: string) {
  const rows = await sql<{ email: string | null }>`
    select email from "user" where id = ${userId} limit 1
  `;
  return (rows[0]?.email || "").trim().toLowerCase();
}

export async function checkoutOrigin() {
  try {
    const request = getRequest();
    if (request) {
      const url = new URL(request.url);
      const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
      const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || url.host;
      const origin = `${proto}://${host}`.replace(/\/$/, "");
      if (CHECKOUT_ORIGINS.has(origin)) return origin;
    }
  } catch {
    /* fall through */
  }
  return "https://getcrewweek.com";
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "pending";
}

async function findOwnerId(sql: Sql, subscription: Stripe.Subscription, hintedUserId: string | null) {
  if (hintedUserId) return hintedUserId;
  const bySub = await sql<{ user_id: string }>`
    select user_id from profiles where stripe_subscription_id = ${subscription.id} limit 1
  `;
  if (bySub[0]?.user_id) return bySub[0].user_id;
  const customerId = idOf(subscription.customer);
  if (!customerId) return null;
  const byCustomer = await sql<{ user_id: string }>`
    select user_id from profiles where stripe_customer_id = ${customerId} limit 1
  `;
  return byCustomer[0]?.user_id ?? null;
}

async function applySubscription(subscription: Stripe.Subscription, hintedUserId: string | null, deleted: boolean) {
  const base = basePlanItem(subscription);
  if (!base) return { ignored: true as const };
  const plan = base.plan;
  const sql = await getSql();
  const userId = await findOwnerId(sql, subscription, hintedUserId || subscription.metadata?.user_id || null);
  if (!userId) return { ignored: true as const };
  if (isDemoEmail(await userEmail(sql, userId))) return { ignored: true as const };
  const current = await sql<{ stripe_subscription_id: string | null; plan_status: string }>`
    select stripe_subscription_id, plan_status from profiles where user_id = ${userId} limit 1
  `;
  const currentId = current[0]?.stripe_subscription_id;
  if (currentId && currentId !== subscription.id && current[0]?.plan_status === "active") {
    return { ignored: true as const };
  }
  const customerId = idOf(subscription.customer);
  if (deleted) {
    await sql`
      update profiles
      set plan_status = ${"canceled"},
          stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
          stripe_subscription_id = ${subscription.id}
      where user_id = ${userId}
    `;
    return { ok: true as const };
  }
  const status = mapStripeStatus(subscription.status);
  await sql`
    update profiles
    set plan_code = ${plan},
        plan_status = ${status},
        plan_price_cents = ${planPriceCents(plan)},
        stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
        stripe_subscription_id = ${subscription.id}
    where user_id = ${userId}
  `;
  return { ok: true as const };
}

export async function createOwnerCheckout(userId: string, plan: SaasPlanCode) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (!email) throw new Error("This account has no email.");
  if (isDemoEmail(email)) throw new Error("Demo accounts do not need a subscription.");
  if (actor.profile.plan_status === "active" && actor.profile.stripe_subscription_id) {
    throw new Error("This account already has an active subscription. Change it in Settings.");
  }
  const stripe = stripeClient();
  const price = priceIdForPlan(plan);
  let customerId = actor.profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: actor.profile.full_name,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
  }
  const keepActive = actor.profile.plan_status === "active";
  await sql`
    update profiles
    set plan_code = ${plan},
        plan_price_cents = ${planPriceCents(plan)},
        plan_status = ${keepActive ? "active" : "pending"},
        stripe_customer_id = ${customerId}
    where user_id = ${userId}
  `;
  const origin = await checkoutOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/choose-plan?checkout=canceled`,
    metadata: { user_id: userId, plan },
    subscription_data: { metadata: { user_id: userId, plan } },
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout link.");
  return { url: session.url };
}

export async function updateOwnerSubscription(userId: string, plan: SaasPlanCode) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email) || !actor.profile.stripe_subscription_id) return { stripe: false as const };
  const stripe = stripeClient();
  const subscription = await stripe.subscriptions.retrieve(actor.profile.stripe_subscription_id);
  const base = basePlanItem(subscription);
  if (!base) throw new Error("Subscription has no price to change.");
  const quantity = extraAdminQuantity(await countBillableAdmins(sql, userId), plan);
  const extraPrice = quantity > 0 ? extraAdminPriceId() : configuredExtraAdminPriceId();
  const items: Stripe.SubscriptionUpdateParams.Item[] = [{ id: base.item.id, price: priceIdForPlan(plan) }];
  if (extraPrice) {
    items.push(
      ...extraAdminItemChanges(listedSubscriptionItems(subscription), extraPrice, quantity),
    );
  }
  await stripe.subscriptions.update(subscription.id, {
    items,
    metadata: { user_id: userId, plan },
    proration_behavior: "create_prorations",
  });
  return { stripe: true as const };
}

export async function syncOwnerExtraAdmins(ownerId: string) {
  const sql = await getSql();
  if (isDemoEmail(await userEmail(sql, ownerId))) return { stripe: false as const };
  const rows = await sql<{
    plan_code: string | null;
    plan_price_cents: number | null;
    stripe_subscription_id: string | null;
  }>`
    select plan_code, plan_price_cents, stripe_subscription_id
    from profiles where user_id = ${ownerId} limit 1
  `;
  const subscriptionId = rows[0]?.stripe_subscription_id;
  if (!subscriptionId) return { stripe: false as const };
  const stored = rows[0]?.plan_code;
  const code: SaasPlanCode =
    stored === "office" || stored === "crew" ? stored : planCodeFromCents(Number(rows[0]?.plan_price_cents || 0));
  const quantity = extraAdminQuantity(await countBillableAdmins(sql, ownerId), code);
  const extraPrice = quantity > 0 ? extraAdminPriceId() : configuredExtraAdminPriceId();
  if (!extraPrice) return { stripe: false as const };
  const stripe = stripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const changes = extraAdminItemChanges(listedSubscriptionItems(subscription), extraPrice, quantity);
  if (changes.length === 0) return { stripe: false as const };
  await stripe.subscriptions.update(subscriptionId, {
    items: changes,
    proration_behavior: "create_prorations",
  });
  return { stripe: true as const };
}

async function paymentMethodPortalConfiguration(stripe: Stripe) {
  const listed = await stripe.billingPortal.configurations.list({ limit: 100, active: true });
  const existing = listed.data.find(
    (item) => item.metadata?.purpose === "crewweek-payment-method" && item.features.payment_method_update.enabled,
  );
  if (existing) return existing.id;
  const created = await stripe.billingPortal.configurations.create({
    name: "CrewWeek payment method",
    metadata: { purpose: "crewweek-payment-method" },
    features: { payment_method_update: { enabled: true } },
  });
  return created.id;
}

export async function createOwnerBillingPortal(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email)) throw new Error("Demo accounts do not manage a Stripe card.");
  const customerId = actor.profile.stripe_customer_id;
  if (!customerId) throw new Error("Stripe does not have a customer for this account yet.");
  const stripe = stripeClient();
  const origin = await checkoutOrigin();
  const returnUrl = `${origin}/app/settings?tab=plan`;
  const configuration = await paymentMethodPortalConfiguration(stripe);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration,
    return_url: returnUrl,
    flow_data: {
      type: "payment_method_update",
      after_completion: {
        type: "redirect",
        redirect: { return_url: returnUrl },
      },
    },
  });
  if (!session.url) throw new Error("Stripe did not return a billing portal link.");
  return { url: session.url };
}

export async function cancelOwnerSubscription(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email) || !actor.profile.stripe_subscription_id) return { stripe: false as const };
  const stripe = stripeClient();
  await stripe.subscriptions.cancel(actor.profile.stripe_subscription_id);
  return { stripe: true as const };
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;
  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) return;
  const subscription = await stripeClient().subscriptions.retrieve(subscriptionId);
  const hinted = session.client_reference_id || session.metadata?.user_id || null;
  await applySubscription(subscription, hinted, false);
}

export async function handleStripeWebhook(raw: Buffer, signature: string | null) {
  if (!signature) return { status: 400, body: { error: "Missing Stripe-Signature" } };
  let stripe: Stripe;
  let secret: string;
  try {
    stripe = stripeClient();
    secret = webhookSecret();
  } catch (err) {
    console.error("[stripe] config", err instanceof Error ? err.message : "config");
    return { status: 500, body: { error: "Stripe is not configured" } };
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return { status: 400, body: { error: "Invalid signature" } };
  }
  if (event.livemode) return { status: 200, body: { received: true, ignored: true } };
  try {
    if (event.type === "checkout.session.completed") {
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "customer.subscription.updated") {
      await applySubscription(event.data.object as Stripe.Subscription, null, false);
    } else if (event.type === "customer.subscription.deleted") {
      await applySubscription(event.data.object as Stripe.Subscription, null, true);
    }
  } catch (err) {
    console.error("[stripe] webhook", event.type, err instanceof Error ? err.message : "failed");
    return { status: 500, body: { error: "Webhook handler failed" } };
  }
  return { status: 200, body: { received: true } };
}
