/** Approved A2P wording. Clients see these sentences on SMS and on the matching email. */

export type ClientNoticeKind = "reminder" | "cancellation";

export function reminderNotice(companyName: string, date: string, time: string) {
  const company = companyName.trim() || "your cleaning company";
  return `CrewWeek: Reminder – your cleaning with ${company} is scheduled for ${date} at ${time}. Reply STOP to opt out.`;
}

export function cancellationNotice(companyName: string, date: string) {
  const company = companyName.trim() || "your cleaning company";
  return `CrewWeek: Your cleaning with ${company} on ${date} has been cancelled. Reply STOP to opt out.`;
}

export function clientNoticeBody(
  kind: ClientNoticeKind,
  input: { companyName: string; date: string; time: string },
) {
  if (kind === "reminder") return reminderNotice(input.companyName, input.date, input.time);
  return cancellationNotice(input.companyName, input.date);
}

export function clientNoticeSubject(kind: ClientNoticeKind) {
  if (kind === "reminder") return "CrewWeek: Cleaning reminder";
  return "CrewWeek: Cleaning cancelled";
}
