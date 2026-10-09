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

/** True after a scheduled cancel reaches the paid-through date. */
export function paidPeriodEnded(input: {
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null | undefined;
  now?: number;
}) {
  if (!input.cancelAtPeriodEnd || !input.periodEnd) return false;
  const end = new Date(input.periodEnd).getTime();
  return Number.isFinite(end) && (input.now ?? Date.now()) >= end;
}
