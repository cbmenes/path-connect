import { useEffect, useState } from "react";
import type { ClientInput } from "@/lib/sweepbook/clients";
import { listChecklistTemplates } from "@/lib/sweepbook/checklists";
import { addressPartsFrom, emptyAddress, namesFrom } from "@/lib/sweepbook/people";
import { hoursToMinutes, minutesToHours } from "@/lib/sweepbook/time";
import { AddressFields } from "@/components/app/address-fields";
import { NameFields } from "@/components/app/name-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export function ClientFields({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: Partial<ClientInput> & { name?: string; address?: string };
  onSubmit: (input: ClientInput) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const names = namesFrom(initial?.first_name, initial?.last_name, initial?.name);
  const [firstName, setFirstName] = useState(names.first_name);
  const [lastName, setLastName] = useState(names.last_name);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial ? addressPartsFrom(initial) : emptyAddress());
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms != null ? String(initial.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms != null ? String(initial.bathrooms) : "");
  const [squareFootage, setSquareFootage] = useState(
    initial?.square_footage != null ? String(initial.square_footage) : "",
  );
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
  const [checklistId, setChecklistId] = useState(initial?.checklist_template_id ?? "");
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void listChecklistTemplates()
      .then((rows) => {
        setTemplates(rows.map((t) => ({ id: t.id, name: t.name })));
        if (!initial?.checklist_template_id) {
          const standard = rows.find((t) => t.name === "Standard") ?? rows[0];
          if (standard) setChecklistId((prev) => prev || standard.id);
        }
      })
      .catch(() => setTemplates([]));
  }, [initial?.checklist_template_id]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          ...address,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          square_footage: squareFootage ? Number(squareFootage) : null,
          access_notes: access,
          pets,
          supplies,
          default_price_cents: price ? Math.round(Number(price) * 100) : null,
          default_duration_min: durationHours ? hoursToMinutes(Number(durationHours)) : null,
          usual_day: day,
          usual_time: time,
          frequency,
          notes,
          checklist_template_id: checklistId || null,
        });
      }}
    >
      <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Phone">
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <AddressFields value={address} onChange={setAddress} />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Bedrooms" hint="Optional">
          <Input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
        </Field>
        <Field label="Bathrooms" hint="Optional">
          <Input type="number" min={0} step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </Field>
        <Field label="Square footage" hint="Optional">
          <Input type="number" min={0} value={squareFootage} onChange={(e) => setSquareFootage(e.target.value)} />
        </Field>
      </div>
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
      <Field label="Notes (Visible to assigned cleaner(s))">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {templates.length ? (
        <Field label="Default job checklist" hint="New visits copy this list. Checking a visit does not change the template.">
          <NativeSelect value={checklistId} onChange={(e) => setChecklistId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
