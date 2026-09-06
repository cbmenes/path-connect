/** Server-only email. Uses Resend when RESEND_API_KEY (or EMAIL_API_KEY) is set. */

export const MAIL_NOT_CONFIGURED =
  "Queued (email not configured). Use Send test when a key is added.";

export function isMailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      process.env.EMAIL_API_KEY?.trim() ||
      process.env.SENDGRID_API_KEY?.trim(),
  );
}

export function fromAddress() {
  return process.env.FROM_EMAIL?.trim() || "SweepBook Reminders <reminders@sweepbook.app>";
}

export function publicAppUrl() {
  const explicit = process.env.APP_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

function parseFrom(from: string): { email: string; name?: string } {
  const m = from.match(/^(.*)<([^>]+)>\s*$/);
  if (m) {
    return { name: m[1].trim().replace(/^"|"$/g, "") || undefined, email: m[2].trim() };
  }
  return { email: from };
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }) {
  const to = input.to.trim();
  if (!to || !to.includes("@")) throw new Error("Recipient email is missing or invalid.");
  const from = fromAddress();
  const resendKey = process.env.RESEND_API_KEY?.trim() || process.env.EMAIL_API_KEY?.trim();
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html || input.text.replace(/\n/g, "<br />"),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body.slice(0, 400)}`);
    }
    return { ok: true as const, provider: "resend" as const };
  }

  const sendgrid = process.env.SENDGRID_API_KEY?.trim();
  if (sendgrid) {
    const parsed = parseFrom(from);
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgrid}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: parsed,
        subject: input.subject,
        content: [
          { type: "text/plain", value: input.text },
          { type: "text/html", value: input.html || input.text.replace(/\n/g, "<br />") },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SendGrid ${res.status}: ${body.slice(0, 400)}`);
    }
    return { ok: true as const, provider: "sendgrid" as const };
  }

  throw new Error(MAIL_NOT_CONFIGURED);
}
