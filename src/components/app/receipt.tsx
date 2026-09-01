import { formatDate, money } from "@/lib/sweepbook/time";

export function ReceiptBody({
  number,
  description,
  amount,
  method,
  paidAt,
  client,
}: {
  number: string | null;
  description: string;
  amount: number;
  method: string | null;
  paidAt: string | null;
  client: string;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-display text-2xl text-navy">{money(amount)}</p>
      <p>{description}</p>
      <p className="text-muted">{client}</p>
      <p className="text-muted">
        {number ? `Receipt ${number}` : "Receipt"} · {method || "card"}
        {paidAt ? ` · ${formatDate(paidAt)}` : ""}
      </p>
      <p className="text-xs text-muted">Test mode — brand and last four only. Full card numbers are never stored.</p>
    </div>
  );
}
