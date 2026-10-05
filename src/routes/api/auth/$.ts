import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { ensureDemoSeed } from "@/lib/sweepbook/seed";

async function handle(request: Request) {
  // Sign-in hits Better Auth directly, so the demo rows must exist in the same
  // database before the password check. Idempotent; no-ops once this process
  // has seeded.
  await ensureDemoSeed(await getSql());
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
