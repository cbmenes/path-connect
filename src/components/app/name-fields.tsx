import { Field, Input } from "@/components/ui/input";

export function NameFields({
  firstName,
  lastName,
  onFirst,
  onLast,
  required = true,
  firstAutoComplete = "given-name",
  lastAutoComplete = "family-name",
}: {
  firstName: string;
  lastName: string;
  onFirst: (v: string) => void;
  onLast: (v: string) => void;
  required?: boolean;
  firstAutoComplete?: string;
  lastAutoComplete?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="First name">
        <Input
          value={firstName}
          onChange={(e) => onFirst(e.target.value)}
          required={required}
          autoComplete={firstAutoComplete}
        />
      </Field>
      <Field label="Last name">
        <Input
          value={lastName}
          onChange={(e) => onLast(e.target.value)}
          required={required}
          autoComplete={lastAutoComplete}
        />
      </Field>
    </div>
  );
}
