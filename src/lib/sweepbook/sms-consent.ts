/** Client SMS consent. Operational texts are allowed only after a YES or START reply. */

export type SmsConsent = "none" | "requested" | "confirmed" | "opted_out";

export function parseSmsConsent(value: unknown): SmsConsent {
  if (value === "requested" || value === "confirmed" || value === "opted_out") return value;
  return "none";
}

export function smsConsentRequested(status: SmsConsent) {
  return status === "requested" || status === "confirmed";
}

/** Appointment reminders, on-my-way alerts, and cancellation notices. */
export function canSendOperationalSms(status: SmsConsent) {
  return status === "confirmed";
}

export function nextSmsConsent(prev: SmsConsent, checked: boolean): SmsConsent {
  if (prev === "confirmed") return "confirmed";
  if (checked) return "requested";
  if (prev === "opted_out") return "opted_out";
  return "none";
}

export function confirmationText(companyName: string) {
  const company = companyName.trim() || "your cleaner";
  return `Reply YES to receive appointment reminders, on-my-way alerts, and cancellation notices from ${company}. Reply STOP to opt out. Msg & data rates may apply.`;
}

export function parseSmsReply(body: string): "confirm" | "stop" | null {
  const word = body.trim().toUpperCase().split(/\s+/)[0]?.replace(/[^A-Z]/g, "") ?? "";
  if (word === "YES" || word === "START") return "confirm";
  if (word === "STOP") return "stop";
  return null;
}

export function smsConsentNote(status: SmsConsent) {
  if (status === "requested") return "Consent requested. Waiting for the client to reply YES.";
  if (status === "confirmed") return "Confirmed. Only a STOP reply opts them out.";
  if (status === "opted_out") return "Opted out. Check the box to send a new confirmation.";
  return "";
}
