export const CREW_PRICE_CENTS = 3900;
export const OFFICE_PRICE_CENTS = 7900;
export const EXTRA_ADMIN_PRICE_CENTS = 1900;
/** Ten months: two months free. */
export const CREW_ANNUAL_PRICE_CENTS = 39000;
export const OFFICE_ANNUAL_PRICE_CENTS = 79000;
export const EXTRA_ADMIN_ANNUAL_PRICE_CENTS = 19000;

export type SaasPlanCode = "crew" | "office";
export type BillingInterval = "month" | "year";

export function parseBillingInterval(value: unknown): BillingInterval {
  return value === "year" || value === "annual" ? "year" : "month";
}

export function planCodeFromCents(cents: number): SaasPlanCode {
  if (cents === OFFICE_PRICE_CENTS || cents === OFFICE_ANNUAL_PRICE_CENTS) return "office";
  return "crew";
}

export function planPriceCents(code: SaasPlanCode, interval: BillingInterval = "month") {
  if (interval === "year") return code === "office" ? OFFICE_ANNUAL_PRICE_CENTS : CREW_ANNUAL_PRICE_CENTS;
  return code === "office" ? OFFICE_PRICE_CENTS : CREW_PRICE_CENTS;
}

export function extraAdminPriceCents(interval: BillingInterval = "month") {
  return interval === "year" ? EXTRA_ADMIN_ANNUAL_PRICE_CENTS : EXTRA_ADMIN_PRICE_CENTS;
}

export function periodInstant(periodEnd: string | null | undefined) {
  if (!periodEnd) return null;
  const end = new Date(periodEnd).getTime();
  return Number.isFinite(end) ? end : null;
}

/** True while the paid-through date is still ahead. */
export function periodStillOpen(periodEnd: string | null | undefined, now = Date.now()) {
  const end = periodInstant(periodEnd);
  return end !== null && end > now;
}

/** True after a scheduled cancel reaches the paid-through date. */
export function paidPeriodEnded(input: {
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null | undefined;
  now?: number;
}) {
  if (!input.cancelAtPeriodEnd) return false;
  const end = periodInstant(input.periodEnd);
  return end !== null && (input.now ?? Date.now()) >= end;
}

/**
 * Pending always locks. Canceled locks once the paid-through date is missing or past.
 * A future paid-through date stays open for both monthly and annual.
 */
export function subscriptionAccessLocked(input: {
  status: string | null | undefined;
  cancelAtPeriodEnd?: boolean | null;
  periodEnd?: string | null;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  if (input.status === "pending") return true;
  if (input.status === "canceled" && !periodStillOpen(input.periodEnd, now)) return true;
  return paidPeriodEnded({
    cancelAtPeriodEnd: Boolean(input.cancelAtPeriodEnd),
    periodEnd: input.periodEnd,
    now,
  });
}

/** Paid-through date when cancel has no Stripe period yet: the current month or year. */
export function fallbackPeriodEnd(interval: BillingInterval, now = Date.now()) {
  const end = new Date(now);
  if (interval === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}
