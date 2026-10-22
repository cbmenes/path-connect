import { getSql } from "@/lib/db";
import { sendClientNotice } from "./client-notify";
import { chicagoDate, partsInChicago } from "./time";

/**
 * One morning pass for the Vercel cron (13:00 UTC, 8:00 AM US Central during
 * daylight time). The 5-minute scheduler still only logs a reminder inside
 * the half-hour around 24 hours. This pass covers the next calendar day in
 * America/Chicago so that single run reaches every client with an email
 * or SMS consent who has a cleaning about a day out.
 */

export type DailyReminderStats = {
  checked: number;
  logged: number;
  skipped: number;
};

function addCalendarDay(year: number, month: number, day: number) {
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

export function nextChicagoDayWindow(now = new Date()) {
  const today = partsInChicago(now);
  const tomorrow = addCalendarDay(today.year, today.month, today.day);
  const after = addCalendarDay(tomorrow.year, tomorrow.month, tomorrow.day);
  return {
    from: chicagoDate(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0),
    until: chicagoDate(after.year, after.month, after.day, 0, 0),
  };
}

export async function processDailyAppointmentReminders(now = new Date()): Promise<DailyReminderStats> {
  const sql = await getSql();
  const { from, until } = nextChicagoDayWindow(now);
  const rows = await sql<{ id: string }>`
    select j.id
    from jobs j
    join clients c on c.id = j.client_id
    where j.status = ${"scheduled"}
      and (
        position('@' in coalesce(c.email, '')) > 0
        or c.sms_consent = ${"confirmed"}
      )
      and j.start_at >= ${from.toISOString()}
      and j.start_at < ${until.toISOString()}
    order by j.start_at asc
  `;

  let logged = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const result = await sendClientNotice(sql, { jobId: row.id, kind: "reminder" });
      if (result.logged) logged += 1;
      else skipped += 1;
    } catch (err) {
      skipped += 1;
      console.error("[crewweek notify]", err instanceof Error ? err.message : "reminder failed");
    }
  }

  return { checked: rows.length, logged, skipped };
}
