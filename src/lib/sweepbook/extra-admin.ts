import type { Sql } from "../db";
import {
  EXTRA_ADMIN_PRICE_CENTS,
  extraAdminPriceCents,
  planPriceCents,
  type BillingInterval,
  type SaasPlanCode,
} from "./plan-prices";

export function includedAdminSeats(code: SaasPlanCode) {
  return code === "office" ? 1 : 0;
}

export function extraAdminQuantity(adminCount: number, code: SaasPlanCode) {
  return Math.max(0, adminCount - includedAdminSeats(code));
}

export function monthlyTotalCents(code: SaasPlanCode, extraQuantity: number) {
  return planPriceCents(code) + extraQuantity * EXTRA_ADMIN_PRICE_CENTS;
}

export function intervalTotalCents(code: SaasPlanCode, extraQuantity: number, interval: BillingInterval) {
  return planPriceCents(code, interval) + extraQuantity * extraAdminPriceCents(interval);
}

export type ExtraAdminItemChange =
  | { id: string; deleted: true }
  | { id: string; quantity: number }
  | { id: string; price: string; quantity: number }
  | { price: string; quantity: number };

/** Quantity 0 removes the item. A matching quantity is left unchanged. */
export function extraAdminItemChanges(
  items: { id: string; priceId: string; quantity: number }[],
  extraPriceId: string,
  quantity: number,
): ExtraAdminItemChange[] {
  const extra = items.find((item) => item.priceId === extraPriceId);
  if (quantity <= 0) return extra ? [{ id: extra.id, deleted: true }] : [];
  if (!extra) return [{ price: extraPriceId, quantity }];
  if (extra.quantity === quantity) return [];
  return [{ id: extra.id, quantity }];
}

/**
 * Keep one Extra Admin item on the interval's price. Quantity 0 removes every
 * Extra Admin item. Switching interval replaces the price on the existing item.
 */
export function alignExtraAdminItems(
  items: { id: string; priceId: string; quantity: number }[],
  knownExtraPriceIds: string[],
  nextExtraPriceId: string,
  quantity: number,
): ExtraAdminItemChange[] {
  const known = new Set(knownExtraPriceIds.filter((id) => id.length > 0));
  if (nextExtraPriceId) known.add(nextExtraPriceId);
  const extras = items.filter((item) => known.has(item.priceId));
  if (quantity <= 0) return extras.map((item) => ({ id: item.id, deleted: true as const }));
  if (!nextExtraPriceId) return [];
  const primary = extras.find((item) => item.priceId === nextExtraPriceId) ?? extras[0];
  const changes: ExtraAdminItemChange[] = [];
  if (!primary) {
    changes.push({ price: nextExtraPriceId, quantity });
  } else if (primary.priceId !== nextExtraPriceId) {
    changes.push({ id: primary.id, price: nextExtraPriceId, quantity });
  } else if (primary.quantity !== quantity) {
    changes.push({ id: primary.id, quantity });
  }
  for (const item of extras) {
    if (primary && item.id === primary.id) continue;
    changes.push({ id: item.id, deleted: true });
  }
  return changes;
}

/**
 * Accepted admin profiles, plus unaccepted admin invites that are not a second
 * copy of an admin who already has a profile (a resend).
 */
export async function countBillableAdmins(sql: Sql, ownerId: string) {
  const profiles = await sql<{ email: string | null }>`
    select lower(email) as email from profiles
    where master_user_id = ${ownerId}
      and coalesce(cleaner_kind, 'team') = 'admin'
  `;
  const invites = await sql<{ email: string | null }>`
    select lower(email) as email from team_invites
    where master_user_id = ${ownerId}
      and accepted_at is null
      and coalesce(invite_kind, 'team') = 'admin'
  `;
  const profileEmails = new Set(
    profiles.map((row) => (row.email || "").trim()).filter((email) => email.length > 0),
  );
  let pending = 0;
  for (const invite of invites) {
    const email = (invite.email || "").trim();
    if (email && profileEmails.has(email)) continue;
    pending += 1;
  }
  return profiles.length + pending;
}
