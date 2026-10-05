import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertCleaner, getActor } from "./access";
import { addDaysChicago, fromDatetimeLocalValue } from "./time";

export type PayType = "none" | "hourly" | "per_job" | "percent";

export const PAY_TYPES: PayType[] = ["none", "hourly", "per_job", "percent"];

export function parsePayType(value: unknown): PayType {
  return PAY_TYPES.includes(value as PayType) ? (value as PayType) : "none";
}

export function hoursFromMinutes(min: number) {
  return Number(min || 0) / 60;
}

export function jobOwedCents(input: {
  payType: PayType;
  payAmount: number;
  hours: number;
  jobCount: number;
  pricesCents: number;
}) {
  if (input.payType === "none") return 0;
  if (input.payType === "hourly") return Math.round(input.payAmount * input.hours);
  if (input.payType === "per_job") return Math.round(input.payAmount * input.jobCount);
  if (input.payType === "percent") return Math.round((input.pricesCents * input.payAmount) / 100);
  return 0;
}

export function payTypeLabel(type: PayType) {
  if (type === "hourly") return "Hourly";
  if (type === "per_job") return "Per job";
  if (type === "percent") return "Percent of job price";
  return "None";
}

export function formatPayRate(type: PayType, amount: number) {
  if (type === "none") return "No rate set";
  if (type === "percent") return `${amount}% of job price`;
  const dollars = (amount || 0) / 100;
  const n = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
  return type === "hourly" ? `${n}/hr` : `${n} per job`;
}

export type TeamPayRow = {
  userId: string;
  name: string;
  payType: PayType;
  payAmount: number;
  payNote: string | null;
  jobCount: number;
  hours: number;
  pricesCents: number;
  jobOwedCents: number;
  tipsCents: number;
};

function rangeBounds(from: string, to: string) {
  const start = fromDatetimeLocalValue(`${from}T00:00`);
  const endDay = fromDatetimeLocalValue(`${to}T00:00`);
  return { start, end: addDaysChicago(endDay, 1) };
}

export const getTeamPayTally = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertCleaner(actor);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.from) || !/^\d{4}-\d{2}-\d{2}$/.test(data.to)) {
      throw new Error("Choose a From and To date.");
    }
    if (data.to < data.from) throw new Error("To must be on or after From.");
    const { start, end } = rangeBounds(data.from, data.to);

    const members = await sql.query<{
      user_id: string;
      full_name: string;
      pay_type: string;
      pay_amount: number;
      pay_note: string | null;
    }>(
      `select user_id, full_name, coalesce(pay_type, 'none') as pay_type,
              coalesce(pay_amount, 0)::int as pay_amount, pay_note
       from profiles
       where master_user_id = $1 and role = 'cleaner'
       order by full_name`,
      [context.userId],
    );

    const jobs = await sql.query<{
      id: string;
      duration_min: number;
      price_cents: number;
      assigned_to_user_id: string | null;
    }>(
      `select id, duration_min, price_cents, assigned_to_user_id
       from jobs
       where cleaner_user_id = $1
         and status <> 'cancelled'
         and start_at >= $2::timestamptz and start_at < $3::timestamptz`,
      [context.userId, start.toISOString(), end.toISOString()],
    );

    const jobIds = jobs.map((j) => j.id);
    const assigneeMap = new Map<string, string[]>();
    if (jobIds.length) {
      const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
      const asg = await sql.query<{ job_id: string; user_id: string }>(
        `select job_id, user_id from job_assignees where job_id in (${placeholders})`,
        jobIds,
      );
      for (const row of asg) {
        const list = assigneeMap.get(row.job_id) ?? [];
        list.push(row.user_id);
        assigneeMap.set(row.job_id, list);
      }
    }
    for (const job of jobs) {
      if (assigneeMap.has(job.id)) continue;
      if (job.assigned_to_user_id) assigneeMap.set(job.id, [job.assigned_to_user_id]);
    }

    const tipByJob = new Map<string, number>();
    if (jobIds.length) {
      const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
      const tips = await sql.query<{ job_id: string; amount_cents: number }>(
        `select job_id, coalesce(amount_cents, 0)::int as amount_cents
         from invoices
         where cleaner_user_id = $${jobIds.length + 1}
           and kind = 'tip'
           and status <> 'void'
           and job_id in (${placeholders})`,
        [...jobIds, context.userId],
      );
      for (const tip of tips) {
        if (!tip.job_id) continue;
        tipByJob.set(tip.job_id, (tipByJob.get(tip.job_id) ?? 0) + Number(tip.amount_cents || 0));
      }
    }

    const uniqueTipJobIds = new Set<string>();
    const rows: TeamPayRow[] = members.map((m) => {
      const payType = parsePayType(m.pay_type);
      let jobCount = 0;
      let minutes = 0;
      let pricesCents = 0;
      let tipsCents = 0;
      for (const job of jobs) {
        const assigned = assigneeMap.get(job.id) ?? [];
        if (!assigned.includes(m.user_id)) continue;
        jobCount += 1;
        minutes += Number(job.duration_min || 0);
        pricesCents += Number(job.price_cents || 0);
        const tip = tipByJob.get(job.id) ?? 0;
        if (tip) {
          tipsCents += tip;
          uniqueTipJobIds.add(job.id);
        }
      }
      const hours = hoursFromMinutes(minutes);
      const payAmount = Number(m.pay_amount || 0);
      return {
        userId: m.user_id,
        name: m.full_name,
        payType,
        payAmount,
        payNote: m.pay_note,
        jobCount,
        hours,
        pricesCents,
        jobOwedCents: jobOwedCents({ payType, payAmount, hours, jobCount, pricesCents }),
        tipsCents,
      };
    });

    let uniqueTipsCents = 0;
    for (const id of uniqueTipJobIds) uniqueTipsCents += tipByJob.get(id) ?? 0;

    return {
      from: data.from,
      to: data.to,
      rows,
      uniqueTipsCents,
    };
  });
