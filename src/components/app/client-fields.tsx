import { useState } from "react";
import type { ClientInput } from "@/lib/sweepbook/clients";
import { hoursToMinutes, minutesToHours } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export function ClientFields({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: Partial<ClientInput>;
  onSubmit: (input: ClientInput) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [access, setAccess] = useState(initial?.access_notes ?? "");
  const [pets, setPets] = useState(initial?.pets ?? "");
  const [supplies, setSupplies] = useState(initial?.supplies ?? "");
  const [price, setPrice] = useState(
    initial?.default_price_cents != null ? (initial.default_price_cents / 100).toFixed(2) : "",
  );
  const [durationHours, setDurationHours] = useState(
    initial?.default_duration_min != null ? String(minutesToHours(initial.default_duration_min)) : "2",
  );
  const [day, setDay] = useState(initial?.usual_day ?? "");
  const [time, setTime] = useState(initial?.usual_time ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "weekly");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          phone,
          email,
          address,
          access_notes: access,
          pets,
          supplies,
          default_price_cents: price ? Math.round(Number(price) * 100) : null,
          default_duration_min: durationHours ? hoursToMinutes(Number(durationHours)) : null,
          usual_day: day,
          usual_time: time,
          frequency,
          notes,
        });
      }}
    >
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Field label="Address">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Access notes">
        <Textarea value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Key under mat, gate code…" />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pets">
          <Input value={pets} onChange={(e) => setPets(e.target.value)} />
        </Field>
        <Field label="Supplies">
          <Input value={supplies} onChange={(e) => setSupplies(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Usual price">
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Duration (hours)" hint="Half-hour steps. Examples: 1, 1.5, 2, 2.5, 3">
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Usual day">
          <NativeSelect value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">—</option>
            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Usual time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Frequency">
          <NativeSelect value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="one-off">One-off</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
