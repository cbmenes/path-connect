import { useState } from "react";
import { smsConsentLabel } from "@/lib/sweepbook/sms-consent";
import { Button } from "@/components/ui/button";

export function SmsConsentForm({
  companyName,
  clientName,
  phone,
  onSubmit,
  submitting,
  submitLabel = "Submit",
}: {
  companyName: string;
  clientName?: string;
  phone: string;
  onSubmit: (agreed: boolean) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const label = smsConsentLabel(companyName);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(agreed);
      }}
    >
      {clientName ? <p className="text-sm text-ink">{clientName}</p> : null}
      <p className="text-sm text-ink">
        <span className="text-muted">Phone number on file: </span>
        {phone}
      </p>
      <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
