import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "./access";
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
  .validator((input: { role: "cleaner" | "client"; fullName: string; businessName?: string }) => {
    const fullName = input.fullName.trim();
    if (!fullName) throw new Error("Name is required.");
    if (input.role !== "cleaner" && input.role !== "client") throw new Error("Choose a role.");
    return { role: input.role, fullName, businessName: input.businessName?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`select user_id from profiles where user_id = ${context.userId} limit 1`;
    if (existing.length) return { ok: true };
    const policy =
      data.role === "cleaner"
        ? "Cancellations made less than 24 hours before a visit may be charged half the scheduled rate."
        : null;
    await sql`
      insert into profiles (
        user_id, role, full_name, business_name, cancellation_policy,
        default_duration_min, default_rate_cents, cleaner_kind, email, plan_status, plan_price_cents
      ) values (
        ${context.userId}, ${data.role}, ${data.fullName}, ${data.businessName},
        ${policy}, ${120}, ${15000}, ${data.role === "cleaner" ? "master" : null},
        ${null}, ${data.role === "cleaner" ? "trial" : "trial"}, ${1900}
      )
    `;
    return { ok: true };
  });
