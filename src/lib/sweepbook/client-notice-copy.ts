/** Approved A2P wording. Clients see these sentences on SMS and on the matching email. */

export type ClientNoticeKind = "reminder" | "on_the_way" | "cancellation";

export function reminderNotice(companyName: string, date: string, time: string) {
  const company = companyName.trim() || "your cleaning company";
  return `CrewWeek: Reminder – your cleaning with ${company} is scheduled for ${date} at ${time}. Reply STOP to opt out.`;
}

export function onTheWayNotice(cleanerName: string, address: string) {
  const cleaner = cleanerName.trim() || "Your cleaner";
  const place = address.trim() || "the address on file";
  return `CrewWeek: ${cleaner} is on the way for your cleaning at ${place}. Reply STOP to opt out.`;
}

export function cancellationNotice(companyName: string, date: string) {
  const company = companyName.trim() || "your cleaning company";
  return `CrewWeek: Your cleaning with ${company} on ${date} has been cancelled. Reply STOP to opt out.`;
}

export function clientNoticeBody(
  kind: ClientNoticeKind,
  input: { companyName: string; date: string; time: string; cleanerName: string; address: string },
) {
  if (kind === "reminder") return reminderNotice(input.companyName, input.date, input.time);
  if (kind === "on_the_way") return onTheWayNotice(input.cleanerName, input.address);
  return cancellationNotice(input.companyName, input.date);
}

export function clientNoticeSubject(kind: ClientNoticeKind) {
  if (kind === "reminder") return "CrewWeek: Cleaning reminder";
  if (kind === "on_the_way") return "CrewWeek: On the way";
  return "CrewWeek: Cleaning cancelled";
}
