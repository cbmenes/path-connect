export const CREW_PRICE_CENTS = 3900;
export const OFFICE_PRICE_CENTS = 7900;
export const EXTRA_ADMIN_PRICE_CENTS = 1900;

export type SaasPlanCode = "crew" | "office";

export function planCodeFromCents(cents: number): SaasPlanCode {
  return cents === OFFICE_PRICE_CENTS ? "office" : "crew";
}

export function planPriceCents(code: SaasPlanCode) {
  return code === "office" ? OFFICE_PRICE_CENTS : CREW_PRICE_CENTS;
}
