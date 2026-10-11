import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { getSql, type Sql } from "../db";
import { getActor } from "./access";
import { alignExtraAdminItems, countBillableAdmins, extraAdminQuantity } from "./extra-admin";
import {
  paidPeriodEnded,
  periodStillOpen,
  planCodeFromCents,
  planPriceCents,
  type BillingInterval,
  type SaasPlanCode,
} from "./plan-prices";
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

function safeStripeMessage(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : "";
  if (!raw || /sk_(live|test)_|rk_(live|test)_|whsec_/i.test(raw)) return fallback;
  return raw;
}

function webhookSecret() {
  const secret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  return secret;
}

function configuredPrice(name: string) {
  const id = envValue(name);
  return id.startsWith("price_") ? id : "";
}

function requiredPrice(name: string) {
  const id = configuredPrice(name);
  if (!id) throw new Error("Stripe price is not configured.");
  return id;
}

export function priceIdForPlan(plan: SaasPlanCode, interval: BillingInterval = "month") {
  if (interval === "year") {
    return requiredPrice(plan === "office" ? "STRIPE_PRICE_OFFICE_ANNUAL" : "STRIPE_PRICE_CREW_ANNUAL");
  }
  return requiredPrice(plan === "office" ? "STRIPE_PRICE_OFFICE" : "STRIPE_PRICE_CREW");
}

export function planFromPriceId(priceId: string | null | undefined): { plan: SaasPlanCode; interval: BillingInterval } | null {
  if (!priceId) return null;
  if (priceId === configuredPrice("STRIPE_PRICE_CREW")) return { plan: "crew", interval: "month" };
  if (priceId === configuredPrice("STRIPE_PRICE_OFFICE")) return { plan: "office", interval: "month" };
  if (priceId === configuredPrice("STRIPE_PRICE_CREW_ANNUAL")) return { plan: "crew", interval: "year" };
  if (priceId === configuredPrice("STRIPE_PRICE_OFFICE_ANNUAL")) return { plan: "office", interval: "year" };
  return null;
}

function extraAdminPriceId(interval: BillingInterval) {
  return requiredPrice(interval === "year" ? "STRIPE_PRICE_EXTRA_ADMIN_ANNUAL" : "STRIPE_PRICE_EXTRA_ADMIN");
}

function knownExtraAdminPriceIds() {
  return [configuredPrice("STRIPE_PRICE_EXTRA_ADMIN"), configuredPrice("STRIPE_PRICE_EXTRA_ADMIN_ANNUAL")].filter(
    (id) => id.length > 0,
  );
}

function basePlanItem(subscription: Stripe.Subscription) {
  for (const item of subscription.items?.data ?? []) {
    const match = planFromPriceId(item.price?.id);
    if (match) return { item, ...match };
  }
  return null;
}

function unixToIso(seconds: number | null | undefined) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function periodEndIso(item: Stripe.SubscriptionItem) {
  return unixToIso(item.current_period_end);
}

function subscriptionPeriodEndIso(subscription: Stripe.Subscription) {
  let latest = 0;
  for (const item of subscription.items?.data ?? []) {
    if (item.current_period_end > latest) latest = item.current_period_end;
  }
  if (latest) return unixToIso(latest);
  return unixToIso(subscription.cancel_at);
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
  if (!base && !deleted) return { ignored: true as const };
  const sql = await getSql();
  const userId = await findOwnerId(sql, subscription, hintedUserId || subscription.metadata?.user_id || null);
  if (!userId) return { ignored: true as const };
  if (isDemoEmail(await userEmail(sql, userId))) return { ignored: true as const };
  const current = await sql<{
    stripe_subscription_id: string | null;
    plan_status: string;
    current_period_end: string | null;
  }>`
    select stripe_subscription_id, plan_status, current_period_end::text as current_period_end
    from profiles where user_id = ${userId} limit 1
  `;
  const currentId = current[0]?.stripe_subscription_id;
  if (currentId && currentId !== subscription.id && (current[0]?.plan_status === "active" || deleted)) {
    return { ignored: true as const };
  }
  const customerId = idOf(subscription.customer);
  const incomingEnd = (base ? periodEndIso(base.item) : null) || subscriptionPeriodEndIso(subscription);
  const periodEnd = incomingEnd || current[0]?.current_period_end || null;
  const stripeStatus = mapStripeStatus(subscription.status);
  const endedNow = deleted || stripeStatus === "canceled";
  const stillPaid = periodStillOpen(periodEnd);
  if (endedNow && !stillPaid) {
    await sql`
      update profiles
      set plan_status = ${"canceled"},
          cancel_at_period_end = ${false},
          current_period_end = coalesce(${periodEnd}, current_period_end),
          stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
          stripe_subscription_id = ${subscription.id}
      where user_id = ${userId}
    `;
    return { ok: true as const };
  }
  if (!base) return { ignored: true as const };
  const plan = base.plan;
  const status = endedNow ? "active" : stripeStatus;
  const cancelAtEnd = status === "active" && (Boolean(subscription.cancel_at_period_end) || endedNow);
  await sql`
    update profiles
    set plan_code = ${plan},
        plan_status = ${status},
        plan_price_cents = ${planPriceCents(plan, base.interval)},
        billing_interval = ${base.interval},
        current_period_end = ${periodEnd},
        cancel_at_period_end = ${cancelAtEnd},
        stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
        stripe_subscription_id = ${subscription.id}
    where user_id = ${userId}
  `;
  return { ok: true as const };
}

export async function createOwnerCheckout(userId: string, plan: SaasPlanCode, interval: BillingInterval = "month") {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (!email) throw new Error("This account has no email.");
  if (isDemoEmail(email)) throw new Error("Demo accounts do not need a subscription.");
  const periodEnded = paidPeriodEnded({
    cancelAtPeriodEnd: actor.profile.cancel_at_period_end,
    periodEnd: actor.profile.current_period_end,
  });
  if (actor.profile.plan_status === "active" && actor.profile.stripe_subscription_id && !periodEnded) {
    throw new Error("This account already has an active subscription. Change it in Settings.");
  }
  const stripe = stripeClient();
  const price = priceIdForPlan(plan, interval);
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
        plan_price_cents = ${planPriceCents(plan, interval)},
        billing_interval = ${interval},
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
    metadata: { user_id: userId, plan, interval },
    subscription_data: { metadata: { user_id: userId, plan, interval } },
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout link.");
  return { url: session.url };
}

export async function updateOwnerSubscription(userId: string, plan: SaasPlanCode, interval: BillingInterval = "month") {
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
  const extraPrice = quantity > 0 ? extraAdminPriceId(interval) : knownExtraAdminPriceIds()[0] || "";
  const items: Stripe.SubscriptionUpdateParams.Item[] = [{ id: base.item.id, price: priceIdForPlan(plan, interval) }];
  if (extraPrice || quantity > 0) {
    items.push(...alignExtraAdminItems(listedSubscriptionItems(subscription), knownExtraAdminPriceIds(), extraPrice, quantity));
  }
  const updated = await stripe.subscriptions.update(subscription.id, {
    items,
    metadata: { user_id: userId, plan, interval },
    cancel_at_period_end: false,
    proration_behavior: "create_prorations",
  });
  await applySubscription(updated, userId, false);
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
  const stripe = stripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const base = basePlanItem(subscription);
  if (!base) return { stripe: false as const };
  const interval = base.interval;
  const extraPrice = quantity > 0 ? extraAdminPriceId(interval) : knownExtraAdminPriceIds()[0] || "";
  if (!extraPrice && quantity <= 0) return { stripe: false as const };
  const changes = alignExtraAdminItems(listedSubscriptionItems(subscription), knownExtraAdminPriceIds(), extraPrice, quantity);
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

async function assertActiveConnectMaster(sql: Sql, userId: string) {
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email)) throw new Error("Demo accounts do not connect Stripe.");
  const periodEnded = paidPeriodEnded({
    cancelAtPeriodEnd: actor.profile.cancel_at_period_end,
    periodEnd: actor.profile.current_period_end,
  });
  if (actor.profile.plan_status !== "active" || periodEnded) {
    throw new Error("An active plan is required to connect Stripe.");
  }
  return { actor, email };
}

export async function createOwnerConnectLink(userId: string) {
  const sql = await getSql();
  const { actor, email } = await assertActiveConnectMaster(sql, userId);
  const stripe = stripeClient();
  let accountId = actor.profile.stripe_account_id;
  if (!accountId) {
    const displayName = actor.profile.business_name?.trim() || actor.profile.full_name.trim();
    let account: Awaited<ReturnType<typeof stripe.v2.core.accounts.create>>;
    try {
      account = await stripe.v2.core.accounts.create({
        display_name: displayName,
        contact_email: email,
        dashboard: "full",
        identity: { country: "US" },
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
        metadata: { user_id: userId },
      });
    } catch (err) {
      throw new Error(safeStripeMessage(err, "Stripe could not create the connected account."));
    }
    accountId = account.id;
    if (!accountId) throw new Error("Stripe did not return a connected account.");
    await sql`update profiles set stripe_account_id = ${accountId} where user_id = ${userId}`;
  } else {
    try {
      await stripe.v2.core.accounts.update(accountId, {
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
      });
    } catch (err) {
      throw new Error(safeStripeMessage(err, "Stripe could not prepare card payments for this account."));
    }
  }
  const origin = await checkoutOrigin();
  let link: Awaited<ReturnType<typeof stripe.v2.core.accountLinks.create>>;
  try {
    link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          return_url: `${origin}/app/settings?tab=plan`,
          refresh_url: `${origin}/app/settings?tab=plan&connect=refresh`,
        },
      },
    });
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe did not return a Connect link."));
  }
  if (!link.url) throw new Error("Stripe did not return a Connect link.");
  return { url: link.url };
}

/** Connected only when Stripe has enabled card payments. Restricted, pending, or unknown is not ready. */
export async function stripeCardPaymentsEnabled(accountId: string) {
  try {
    const stripe = stripeClient();
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.merchant"],
    });
    if (account.closed) return false;
    return account.configuration?.merchant?.capabilities?.card_payments?.status === "active";
  } catch {
    return false;
  }
}

export async function openOwnerStripeAccount(userId: string) {
  const sql = await getSql();
  const { actor } = await assertActiveConnectMaster(sql, userId);
  if (!actor.profile.stripe_account_id) throw new Error("Connect Stripe before opening the account.");
  if (!(await stripeCardPaymentsEnabled(actor.profile.stripe_account_id))) {
    throw new Error("Finish Stripe setup in Settings before opening the account.");
  }
  return { url: "https://dashboard.stripe.com" };
}

export async function disconnectOwnerStripeAccount(userId: string) {
  const sql = await getSql();
  await assertActiveConnectMaster(sql, userId);
  await sql`update profiles set stripe_account_id = ${null} where user_id = ${userId}`;
  return { ok: true as const };
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
  const subscriptionId = actor.profile.stripe_subscription_id;
  const existing = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = subscriptionPeriodEndIso(existing) || actor.profile.current_period_end;
  if (periodEnd && !periodStillOpen(periodEnd)) {
    try {
      const canceled = await stripe.subscriptions.cancel(subscriptionId, { prorate: false, invoice_now: false });
      await applySubscription(canceled, userId, true);
    } catch {
      await sql`
        update profiles
        set plan_status = ${"canceled"}, cancel_at_period_end = ${false}
        where user_id = ${userId}
      `;
    }
    return { stripe: true as const };
  }
  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  await applySubscription(updated, userId, false);
  return { stripe: true as const };
}

export async function resumeOwnerRenewal(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email) || !actor.profile.stripe_subscription_id) return { stripe: false as const };
  const stripe = stripeClient();
  const updated = await stripe.subscriptions.update(actor.profile.stripe_subscription_id, {
    cancel_at_period_end: false,
  });
  await applySubscription(updated, userId, false);
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

/** Direct charge on the connected account. The platform does not take the payout. */
export async function createConnectedChargeCheckout(input: {
  accountId: string;
  amountCents: number;
  description: string;
  invoiceId: string;
  customerEmail?: string | null;
}) {
  const stripe = stripeClient();
  const origin = await checkoutOrigin();
  const description = input.description.trim().slice(0, 120) || "Cleaning";
  const email = input.customerEmail?.includes("@") ? input.customerEmail.trim() : undefined;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: input.amountCents,
              product_data: { name: description },
            },
          },
        ],
        customer_email: email,
        success_url: `${origin}/app/charge/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/app/charge/return?canceled=1`,
        metadata: { purpose: "client_charge", invoice_id: input.invoiceId },
        payment_intent_data: {
          metadata: { purpose: "client_charge", invoice_id: input.invoiceId },
        },
      },
      { stripeAccount: input.accountId },
    );
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe could not start the charge."));
  }
  if (session.livemode) throw new Error("A Stripe test charge is required.");
  if (!session.url || !session.id) throw new Error("Stripe did not return a Checkout link.");
  return { url: session.url, sessionId: session.id };
}

export async function retrieveConnectedChargeSession(accountId: string, sessionId: string) {
  const stripe = stripeClient();
  try {
    return await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent.latest_charge"] },
      { stripeAccount: accountId },
    );
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe could not confirm the charge."));
  }
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
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.metadata?.purpose === "client_charge" && session.id) {
        const { settleClientCheckoutSession } = await import("./payments");
        await settleClientCheckoutSession(session.id, event.account ?? null);
      } else {
        await onCheckoutCompleted(session);
      }
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
