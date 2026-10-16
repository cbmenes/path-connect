/** Client SMS consent. Operational texts are allowed only after the client submits the consent form. */

export type SmsConsent = "none" | "confirmed" | "opted_out";

export function parseSmsConsent(value: unknown): SmsConsent {
  if (value === "confirmed" || value === "opted_out") return value;
  return "none";
}

/** Appointment reminders, on-my-way alerts, and cancellation notices. */
export function canSendOperationalSms(status: SmsConsent) {
  return status === "confirmed";
}

export function smsConsentStatusLabel(status: SmsConsent) {
  if (status === "confirmed") return "Consented";
  if (status === "opted_out") return "Opted out";
  return "Not consented";
}

export function smsConsentLabel(companyName: string) {
  const company = companyName.trim() || "your cleaning company";
  return `I agree to receive SMS messages from ${company} about appointment reminders, on-my-way alerts, and cancellation notices. Message and data rates may apply. Reply STOP to opt out.`;
}

export function parseSmsReply(body: string): "stop" | null {
  const word = body.trim().toUpperCase().split(/\s+/)[0]?.replace(/[^A-Z]/g, "") ?? "";
  if (word === "STOP") return "stop";
  return null;
}
