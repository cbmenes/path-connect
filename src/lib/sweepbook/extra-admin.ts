import type { Sql } from "../db";
import { EXTRA_ADMIN_PRICE_CENTS, planPriceCents, type SaasPlanCode } from "./plan-prices";

export function includedAdminSeats(code: SaasPlanCode) {
  return code === "office" ? 1 : 0;
}

export function extraAdminQuantity(adminCount: number, code: SaasPlanCode) {
  return Math.max(0, adminCount - includedAdminSeats(code));
}

export function monthlyTotalCents(code: SaasPlanCode, extraQuantity: number) {
  return planPriceCents(code) + extraQuantity * EXTRA_ADMIN_PRICE_CENTS;
}

export type ExtraAdminItemChange =
  | { id: string; deleted: true }
  | { id: string; quantity: number }
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
