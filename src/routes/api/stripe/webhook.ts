import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/lib/sweepbook/stripe.server";

async function handle(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("stripe-signature");
  const result = await handleStripeWebhook(raw, signature);
  return Response.json(result.body, { status: result.status });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
