import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_SITE } from "@/lib/brand";

function formParams(form: FormData) {
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

function candidateUrls(request: Request) {
  const urls = new Set<string>();
  urls.add(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) urls.add(`${proto}://${host}/api/sms/inbound`);
  urls.add(`${PUBLIC_SITE}/api/sms/inbound`);
  urls.add("https://www.getcrewweek.com/api/sms/inbound");
  return [...urls];
}

async function handle(request: Request) {
  const form = await request.formData();
  const params = formParams(form);
  const { applyInboundSms, twilioSignatureValid } = await import("@/lib/sweepbook/sms.server");
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const signature = request.headers.get("x-twilio-signature") || "";
  const production = process.env.NODE_ENV === "production";
  if (production && !token) return new Response("SMS is not set up.", { status: 503 });
  if (token) {
    const valid =
      signature && candidateUrls(request).some((url) => twilioSignatureValid(url, params, signature, token));
    if (!valid) return new Response("Invalid signature.", { status: 403 });
  } else if (production) {
    return new Response("Invalid signature.", { status: 403 });
  }
  await applyInboundSms(params.From || "", params.Body || "");
  return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}

export const Route = createFileRoute("/api/sms/inbound")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
