import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "./access";

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

function parseCode(value: string): SaasPlanCode {
  if (value !== "crew" && value !== "office") throw new Error("Choose Crew or Office.");
  return value;
}

async function requireMaster(userId: string) {
  const sql = await getSql();
  const actor = await getActor(sql, userId);
  if (actor.kind !== "cleaner") throw new Error("Billing is Master-only.");
  return { sql, actor };
}

export const getSaasPlan = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "admin") return { access: "locked" as const };
    if (actor.kind !== "cleaner") return { access: "hidden" as const };
    const code = planCodeFromCents(actor.profile.plan_price_cents);
    return {
      access: "master" as const,
      code,
      status: actor.profile.plan_status,
      priceCents: actor.profile.plan_status === "trial" ? planPriceCents(code) : actor.profile.plan_price_cents,
    };
  });

export const startSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: parseCode(input.code) }))
  .handler(async ({ context, data }) => {
    const { sql } = await requireMaster(context.userId);
    const cents = planPriceCents(data.code);
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code: data.code };
  });

export const changeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: parseCode(input.code) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireMaster(context.userId);
    if (actor.profile.plan_status === "canceled") throw new Error("Resume the plan before changing it.");
    const cents = planPriceCents(data.code);
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code: data.code };
  });

export const cancelSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { sql, actor } = await requireMaster(context.userId);
    if (actor.profile.plan_status !== "active") throw new Error("Only an active plan can be canceled.");
    await sql`
      update profiles set plan_status = ${"canceled"} where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const resumeSaasPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { sql, actor } = await requireMaster(context.userId);
    const cents = planPriceCents(planCodeFromCents(actor.profile.plan_price_cents));
    await sql`
      update profiles
      set plan_status = ${"active"}, plan_price_cents = ${cents}
      where user_id = ${context.userId}
    `;
    return { ok: true as const, code: planCodeFromCents(cents) };
  });
