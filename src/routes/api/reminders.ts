import { createFileRoute } from "@tanstack/react-router";
import { processDueReminders, REMINDER_HOST_NOTE } from "@/lib/sweepbook/reminders";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

async function handle(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET?.trim();
  if (secret) {
    const url = new URL(request.url);
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : url.searchParams.get("secret") || "";
    if (token !== secret) return unauthorized();
  }
  const result = await processDueReminders();
  return Response.json({ ...result, note: REMINDER_HOST_NOTE });
}

export const Route = createFileRoute("/api/reminders")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
