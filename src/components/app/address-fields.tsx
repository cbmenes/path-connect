import type { AddressParts } from "@/lib/sweepbook/people";
import { Field, Input } from "@/components/ui/input";

export function AddressFields({
  value,
  onChange,
  required,
}: {
  value: AddressParts;
  onChange: (next: AddressParts) => void;
  required?: boolean;
}) {
  function set<K extends keyof AddressParts>(key: K, v: string) {
    onChange({ ...value, [key]: key === "state" ? v.toUpperCase() : v });
  }
  return (
    <div className="grid gap-3">
      <Field label="Address line 1">
        <Input
          value={value.address_line1}
          onChange={(e) => set("address_line1", e.target.value)}
          required={required}
          autoComplete="address-line1"
        />
      </Field>
      <Field label="Address line 2" hint="Optional">
        <Input
          value={value.address_line2}
          onChange={(e) => set("address_line2", e.target.value)}
          autoComplete="address-line2"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem]">
        <Field label="City">
          <Input
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            required={required}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="State">
          <Input
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
            required={required}
            maxLength={2}
            autoComplete="address-level1"
            placeholder="OK"
          />
        </Field>
        <Field label="Zip">
          <Input
            value={value.zip}
            onChange={(e) => set("zip", e.target.value)}
            required={required}
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </Field>
      </div>
    </div>
  );
}
