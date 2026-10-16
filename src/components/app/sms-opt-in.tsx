import { APP_NAME } from "@/lib/brand";
import { smsConsentNote, type SmsConsent } from "@/lib/sweepbook/sms-consent";

export function SmsOptInCheckbox({
  checked,
  onChange,
  status = "none",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  status?: SmsConsent;
}) {
  const note = smsConsentNote(status);
  return (
    <div className="grid gap-1">
      <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0"
          checked={checked}
          disabled={status === "confirmed"}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          Ask this client to confirm SMS from {APP_NAME}. They must reply YES before appointment reminders, on-my-way
          alerts, or cancellation notices are sent. Message and data rates may apply. Reply STOP to opt out.
        </span>
      </label>
      {note ? <p className="pl-6 text-xs text-muted">{note}</p> : null}
    </div>
  );
}
