import { formatDate, money } from "@/lib/sweepbook/time";

export function paidMethodLabel(method: string | null | undefined, note?: string | null) {
  if (method === "card") return "Card";
  const text = (note ?? "").trim();
  return text || null;
}

function cleaningDay(iso: string) {
  return formatDate(iso, { weekday: "short", month: "short", day: "numeric" });
}

function paidDay(iso: string) {
  return formatDate(iso, { month: "short", day: "numeric" });
}

/** Visit charge copy. Cleaning date is the appointment start, never createdAt. */
export function visitChargeLine(input: {
  jobStart?: string | null;
  status: string;
  paidAt?: string | null;
  method?: string | null;
  note?: string | null;
  tipCents?: number | null;
}) {
  const cleaning = input.jobStart ? cleaningDay(input.jobStart) : "—";
  if (input.status === "paid") {
    const parts = [`Cleaning: ${cleaning}`, `Paid: ${input.paidAt ? paidDay(input.paidAt) : "—"}`];
    const method = paidMethodLabel(input.method, input.note);
    if (method) parts.push(method);
    if (input.tipCents && input.tipCents > 0) parts.push(`Tip ${money(input.tipCents)}`);
    return parts.join(" · ");
  }
  const status = input.status === "failed" ? "Failed" : "Unpaid";
  return `Cleaning: ${cleaning} · Status: ${status}`;
}

export function visitChargeSentence(input: { jobStart?: string | null; paidAt?: string | null; status: string }) {
  if (input.status !== "paid" || !input.jobStart || !input.paidAt) return null;
  return `Payment for cleaning on ${cleaningDay(input.jobStart)}. Charged ${paidDay(input.paidAt)}.`;
}

export function VisitChargeLine(props: Parameters<typeof visitChargeLine>[0] & { className?: string }) {
  const { className, ...input } = props;
  return <p className={className ?? "text-xs text-muted"}>{visitChargeLine(input)}</p>;
}

export function ReceiptBody({
  number,
  description,
  amount,
  method,
  paidAt,
  client,
  note,
  jobStart,
  status = "paid",
  tipCents,
}: {
  number: string | null;
  description: string;
  amount: number;
  method: string | null;
  paidAt: string | null;
  client: string;
  note?: string | null;
  jobStart?: string | null;
  status?: string;
  tipCents?: number | null;
}) {
  const sentence = visitChargeSentence({ jobStart, paidAt, status });
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-display text-2xl text-navy">{money(amount)}</p>
      {sentence ? <p>{sentence}</p> : null}
      <p>{description}</p>
      <p className="text-muted">{client}</p>
      <p className="text-muted">{visitChargeLine({ jobStart, status, paidAt, method, note, tipCents })}</p>
      <p className="text-muted">{number ? `Receipt ${number}` : "Receipt"}</p>
      <p className="text-xs text-muted">Test mode — brand and last four only. Full card numbers are never stored.</p>
    </div>
  );
}
