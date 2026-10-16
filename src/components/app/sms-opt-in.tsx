import { APP_NAME } from "@/lib/brand";

export function SmsOptInCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-ink">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        I agree to receive SMS messages from {APP_NAME} about appointment reminders, on-my-way alerts, and
        cancellation notices. Message and data rates may apply. Reply STOP to opt out.
      </span>
    </label>
  );
}
