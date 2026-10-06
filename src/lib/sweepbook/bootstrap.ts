import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "./access";
import { ensureBookingSlug, namesFrom } from "./people";
import { ensureReminderScheduler } from "./reminders";
import { ensureDemoSeed } from "./seed";
import type { Actor } from "./types";

export const bootstrapDemo = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await ensureDemoSeed(sql);
  return { ok: true as const };
});

export const getMyActor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Actor> => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    ensureReminderScheduler();
    return getActor(sql, context.userId);
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { role: "cleaner" | "client"; firstName: string; lastName: string; businessName?: string; plan?: string }) => {
    const names = namesFrom(input.firstName, input.lastName);
    if (!names.first_name || !names.last_name) throw new Error("First and last name are required.");
    if (input.role !== "cleaner" && input.role !== "client") throw new Error("Choose a role.");
    const plan = input.plan === "office" || input.plan === "crew" ? input.plan : null;
    return {
      role: input.role,
      ...names,
      businessName: input.businessName?.trim() || null,
      plan,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`select user_id from profiles where user_id = ${context.userId} limit 1`;
    if (existing.length) return { ok: true };
    const policy =
      data.role === "cleaner"
        ? "Cancellations made less than 24 hours before a visit may be charged half the scheduled rate."
        : null;
    const planCode = data.role === "cleaner" ? data.plan : null;
    const planStatus = data.role === "cleaner" && planCode ? "pending" : "trial";
    const planCents = planCode === "office" ? 7900 : planCode === "crew" ? 3900 : 3900;
    await sql`
      insert into profiles (
        user_id, role, full_name, first_name, last_name, business_name, cancellation_policy,
        default_duration_min, default_rate_cents, cleaner_kind, email, plan_status, plan_price_cents, plan_code
      ) values (
        ${context.userId}, ${data.role}, ${data.name}, ${data.first_name}, ${data.last_name}, ${data.businessName},
        ${policy}, ${120}, ${15000}, ${data.role === "cleaner" ? "master" : null},
        ${null}, ${planStatus}, ${planCents}, ${planCode}
      )
    `;
    if (data.role === "cleaner") {
      await ensureBookingSlug(sql, context.userId, data.businessName || data.name);
    }
    await sql`update "user" set name = ${data.name} where id = ${context.userId}`;
    return { ok: true };
  });
