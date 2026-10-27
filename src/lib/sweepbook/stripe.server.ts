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

function isTestSecret(key: string) {
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

function isLiveSecret(key: string) {
  return key.startsWith("sk_live_") || key.startsWith("rk_live_");
}

export function stripeSecretKey() {
  const key = envValue("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe is not configured.");
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (production && isLiveSecret(key)) return key;
  if (!isTestSecret(key)) throw new Error("A Stripe test secret key is required.");
  return key;
}

function stripePublishableKey() {
  const key = envValue("STRIPE_PUBLISHABLE_KEY");
  if (!key) throw new Error("Stripe is not configured.");
  if (!key.startsWith("pk_test_")) throw new Error("A Stripe test publishable key is required.");
  return key;
}

/** Publishable key for the platform subscription. Live only when the secret is live. */
function platformPublishableKey() {
  const key = envValue("STRIPE_PUBLISHABLE_KEY");
  if (!key) throw new Error("Stripe is not configured.");
  const secret = envValue("STRIPE_SECRET_KEY");
  if (isLiveSecret(secret)) {
    if (!key.startsWith("pk_live_")) throw new Error("Stripe is not configured.");
    return key;
  }
  if (!key.startsWith("pk_test_")) throw new Error("A Stripe test publishable key is required.");
  return key;
}

function safeStripeMessage(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : "";
  if (!raw || /sk_(live|test)_|rk_(live|test)_|pk_(live|test)_|whsec_/i.test(raw)) return fallback;
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
    ui_mode: "embedded_page",
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    return_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    redirect_on_completion: "always",
    metadata: { user_id: userId, plan, interval },
    subscription_data: { metadata: { user_id: userId, plan, interval } },
  });
  if (!session.client_secret) throw new Error("Stripe did not open the payment form.");
  return { clientSecret: session.client_secret, publishableKey: platformPublishableKey() };
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

export type OwnerInvoice = {
  id: string;
  number: string | null;
  status: string;
  created: number;
  amountCents: number;
  hostedUrl: string | null;
};

/** Subscription invoices for the Master. Does not change the plan or the payment method. */
export async function listOwnerSubscriptionInvoices(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  const email = await userEmail(sql, userId);
  if (isDemoEmail(email)) return { demo: true as const, invoices: [] as OwnerInvoice[] };
  const customerId = actor.profile.stripe_customer_id;
  if (!customerId) return { demo: false as const, invoices: [] as OwnerInvoice[] };
  const stripe = stripeClient();
  let listed: Awaited<ReturnType<typeof stripe.invoices.list>>;
  try {
    listed = await stripe.invoices.list({ customer: customerId, limit: 24 });
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Billing history is unavailable right now."));
  }
  return {
    demo: false as const,
    invoices: listed.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status || "open",
      created: invoice.created,
      amountCents: invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
      hostedUrl: invoice.hosted_invoice_url,
    })),
  };
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

/** Customer and SetupIntent on the connected account. The browser confirms the card with Stripe.js. */
export async function beginConnectedCardSetup(input: {
  accountId: string;
  existingCustomerId: string | null;
  email?: string | null;
  name?: string | null;
}) {
  const stripe = stripeClient();
  const publishableKey = stripePublishableKey();
  try {
    let customerId = input.existingCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: input.email?.includes("@") ? input.email.trim() : undefined,
          name: input.name?.trim() || undefined,
        },
        { stripeAccount: input.accountId },
      );
      if (customer.livemode) throw new Error("A Stripe test card setup is required.");
      customerId = customer.id;
    }
    const setup = await stripe.setupIntents.create(
      {
        customer: customerId,
        allowed_payment_method_types: ["card"],
        usage: "off_session",
      },
      { stripeAccount: input.accountId },
    );
    if (setup.livemode || !setup.client_secret) throw new Error("A Stripe test card setup is required.");
    return { clientSecret: setup.client_secret, customerId, publishableKey, accountId: input.accountId };
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe could not start card setup."));
  }
}

/** Brand and last four only. The full card number never leaves Stripe. */
export async function readConnectedSetupCard(accountId: string, setupIntentId: string) {
  if (!setupIntentId.startsWith("seti_")) throw new Error("Missing Stripe card setup.");
  const stripe = stripeClient();
  try {
    const setup = await stripe.setupIntents.retrieve(
      setupIntentId,
      { expand: ["payment_method"] },
      { stripeAccount: accountId },
    );
    if (setup.livemode) throw new Error("A Stripe test card setup is required.");
    if (setup.status !== "succeeded") throw new Error("Stripe has not saved this card.");
    const pm = setup.payment_method;
    if (!pm || typeof pm === "string" || !pm.id.startsWith("pm_") || !pm.card?.last4) {
      throw new Error("Stripe did not return a card.");
    }
    const customerId = typeof setup.customer === "string" ? setup.customer : setup.customer?.id || null;
    if (!customerId) throw new Error("Stripe did not save this card on the connected account.");
    return {
      customerId,
      paymentMethodId: pm.id,
      brand: pm.card.brand || "Card",
      last4: pm.card.last4,
      expMonth: pm.card.exp_month ?? null,
      expYear: pm.card.exp_year ?? null,
      holderName: pm.billing_details?.name || null,
    };
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe could not save this card."));
  }
}

/** Off-session charge of a saved card on the connected account. No Checkout redirect. */
export async function chargeConnectedSavedCard(input: {
  accountId: string;
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  description: string;
  invoiceId: string;
}) {
  const stripe = stripeClient();
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: "usd",
        customer: input.customerId,
        payment_method: input.paymentMethodId,
        off_session: true,
        confirm: true,
        description: input.description.trim().slice(0, 120) || "Cleaning",
        metadata: { purpose: "client_charge", invoice_id: input.invoiceId },
        expand: ["latest_charge"],
      },
      { stripeAccount: input.accountId },
    );
    if (intent.livemode) throw new Error("A Stripe test charge is required.");
    return { id: intent.id, status: intent.status, amount: intent.amount };
  } catch (err) {
    throw new Error(safeStripeMessage(err, "Stripe could not charge this card."));
  }
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

async function settleSavedCardEvent(paymentIntentId: string, invoiceId: string, accountId: string) {
  const stripe = stripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: accountId });
  if (intent.livemode || intent.status !== "succeeded") return;
  if (intent.metadata?.invoice_id !== invoiceId || intent.metadata.purpose !== "client_charge") return;
  const charge = intent.latest_charge;
  const card =
    charge && typeof charge !== "string" ? charge.payment_method_details?.card : null;
  const { applySavedCardPayment } = await import("./client-charge.server");
  await applySavedCardPayment({
    invoiceId,
    accountId,
    paymentIntentId: intent.id,
    amountCents: intent.amount,
    livemode: intent.livemode,
    status: intent.status,
    brand: card?.brand || "Card",
    last4: card?.last4 || "",
  });
}

async function settleConnectedCheckoutEvent(sessionId: string, accountHint: string | null) {
  const sql = await getSql();
  const rows = await sql<{ stripe_account_id: string | null }>`
    select stripe_account_id from invoices
    where stripe_checkout_session_id = ${sessionId}
    limit 1
  `;
  const accountId = rows[0]?.stripe_account_id;
  if (!accountId || (accountHint && accountHint !== accountId)) return;
  const session = await retrieveConnectedChargeSession(accountId, sessionId);
  const { applyConnectedCharge } = await import("./client-charge.server");
  await applyConnectedCharge(session, accountId);
}

function ownerSubscriptionEvent(event: Stripe.Event) {
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") return true;
  if (event.type !== "checkout.session.completed") return false;
  const session = event.data.object as Stripe.Checkout.Session;
  return session.mode === "subscription";
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
  if (event.livemode && !ownerSubscriptionEvent(event)) {
    return { status: 200, body: { received: true, ignored: true } };
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.metadata?.purpose === "client_charge" && session.id) {
        await settleConnectedCheckoutEvent(session.id, event.account ?? null);
      } else {
        await onCheckoutCompleted(session);
      }
    } else if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.purpose === "client_charge" && intent.metadata.invoice_id && event.account) {
        await settleSavedCardEvent(intent.id, intent.metadata.invoice_id, event.account);
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
