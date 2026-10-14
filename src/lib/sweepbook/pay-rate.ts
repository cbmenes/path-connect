export type PayType = "none" | "hourly" | "per_job" | "percent";

export const PAY_TYPES: PayType[] = ["none", "hourly", "per_job", "percent"];

export function parsePayType(value: unknown): PayType {
  return PAY_TYPES.includes(value as PayType) ? (value as PayType) : "none";
}

export function hoursFromMinutes(min: number) {
  return Number(min || 0) / 60;
}

export function jobOwedCents(input: {
  payType: PayType;
  payAmount: number;
  hours: number;
  jobCount: number;
  pricesCents: number;
}) {
  if (input.payType === "none") return 0;
  if (input.payType === "hourly") return Math.round(input.payAmount * input.hours);
  if (input.payType === "per_job") return Math.round(input.payAmount * input.jobCount);
  if (input.payType === "percent") return Math.round((input.pricesCents * input.payAmount) / 100);
  return 0;
}

export function payTypeLabel(type: PayType) {
  if (type === "hourly") return "Hourly";
  if (type === "per_job") return "Per job";
  if (type === "percent") return "Percent of job price";
  return "None";
}

export function formatPayRate(type: PayType, amount: number) {
  if (type === "none") return "No rate set";
  if (type === "percent") return `${amount}% of job price`;
  const dollars = (amount || 0) / 100;
  const n = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
  return type === "hourly" ? `${n}/hr` : `${n} per job`;
}
