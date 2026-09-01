import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { formatCardNumber, luhnOk, TEST_DECLINE, TEST_SUCCESS } from "@/lib/sweepbook/card-utils";

export type CardPayload = {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  holderName: string;
};

export function CardForm({
  onSubmit,
  submitting,
  submitLabel = "Save card",
}: {
  onSubmit: (payload: CardPayload) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (!luhnOk(digits)) {
      setError("Check the card number.");
      return;
    }
    const [mm, yy] = expiry.split("/");
    const expMonth = Number(mm);
    const expYear = Number(yy?.length === 2 ? `20${yy}` : yy);
    if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
      setError("Use a valid expiry (MM/YY).");
      return;
    }
    if (cvc.replace(/\D/g, "").length < 3) {
      setError("Enter the CVC.");
      return;
    }
    setError(null);
    await onSubmit({
      number: digits,
      expMonth,
      expYear,
      cvc: cvc.replace(/\D/g, ""),
      holderName: name.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="flex items-center justify-between rounded-md bg-navy px-3 py-2 text-xs text-primary-foreground">
        <span className="font-medium tracking-wide">TEST MODE</span>
        <span className="opacity-80">No live charges. Cards are never stored in full.</span>
      </div>
      <Field label="Cardholder name">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="cc-name" required />
      </Field>
      <Field label="Card number">
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="ACCT-000015"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expiry">
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
              setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
            }}
            required
          />
        </Field>
        <Field label="CVC">
          <Input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-muted">
        Try {formatCardNumber(TEST_SUCCESS)} to succeed, or {formatCardNumber(TEST_DECLINE)} to simulate a decline.
        Only brand and last four are saved.
      </p>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
