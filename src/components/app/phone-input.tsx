import { formatPhoneAsTyped, phoneDigits } from "@/lib/sweepbook/people";
import { Input } from "@/components/ui/input";

export function PhoneInput({
  value,
  onChange,
  required,
  name,
  autoComplete = "tel",
}: {
  value: string;
  onChange: (digits: string) => void;
  required?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <Input
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      required={required}
      value={formatPhoneAsTyped(value)}
      placeholder="(405) 555-0100"
      onChange={(e) => onChange(phoneDigits(e.target.value))}
    />
  );
}
