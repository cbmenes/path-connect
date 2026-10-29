import { createFileRoute } from "@tanstack/react-router";
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
  const result = await processDueSignupRecovery();
  return Response.json(result);
}

export const Route = createFileRoute("/api/cron/signup-recovery")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
