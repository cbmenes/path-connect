import { createFileRoute } from "@tanstack/react-router";
import { processDailyAppointmentReminders } from "@/lib/sweepbook/daily-reminders";
import { processDueSignupRecovery } from "@/lib/sweepbook/signup-recovery";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function authorized(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.REMINDER_CRON_SECRET]
    .map((value) => value?.trim() || "")
    .filter(Boolean);
  if (!secrets.length) return true;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret")?.trim() || "";
  const presented = token || query;
  return secrets.includes(presented);
}

async function handle(request: Request) {
  if (!authorized(request)) return unauthorized();
  const result = await processDailyAppointmentReminders();
  let signupRecovery: Awaited<ReturnType<typeof processDueSignupRecovery>> | { error: string } | null = null;
  try {
    signupRecovery = await processDueSignupRecovery();
  } catch (err) {
    console.error("[signup-recovery]", err instanceof Error ? err.message : "failed");
    signupRecovery = { error: "Signup recovery did not finish." };
  }
  return Response.json({ ...result, signupRecovery });
}

export const Route = createFileRoute("/api/cron/reminders")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
