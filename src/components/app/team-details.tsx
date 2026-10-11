import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { availabilitySummary } from "@/lib/sweepbook/availability";
import type { AddressParts } from "@/lib/sweepbook/people";
import type { AvailabilityWindow } from "@/lib/sweepbook/types";
import { OpenedContent } from "@/components/app/opened-content";
import { AddressFields } from "@/components/app/address-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
];

export function TeamDetailSections({
  notes,
  onNotes,
  availability,
  onAvailability,
  address,
  onAddress,
  emergencyName,
  onEmergencyName,
  emergencyPhone,
  onEmergencyPhone,
  birthday,
  onBirthday,
  startDate,
  onStartDate,
}: {
  notes: string;
  onNotes: (value: string) => void;
  availability: AvailabilityWindow[];
  onAvailability: (value: AvailabilityWindow[]) => void;
  address: AddressParts;
  onAddress: (value: AddressParts) => void;
  emergencyName: string;
  onEmergencyName: (value: string) => void;
  emergencyPhone: string;
  onEmergencyPhone: (value: string) => void;
  birthday: string;
  onBirthday: (value: string) => void;
  startDate: string;
  onStartDate: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <DetailSection title="Notes" summary={notes.trim() ? "Saved" : "None"}>
        <Field label="Notes" hint="Only the Master and Admins can see this.">
          <Textarea value={notes} onChange={(e) => onNotes(e.target.value)} />
        </Field>
      </DetailSection>
      <DetailSection title="Availability" summary={availabilitySummary(availability)}>
        <p className="text-xs text-muted">
          Optional weekly windows. Leave this empty for no restriction. If you add windows, scheduling is limited to those times.
        </p>
        <div className="grid gap-2">
          {availability.map((window, index) => (
            <div key={`${window.day}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
              <Field label="Day">
                <NativeSelect
                  value={String(window.day)}
                  onChange={(e) => onAvailability(replaceAt(availability, index, { ...window, day: Number(e.target.value) }))}
                >
                  {DAYS.map((d) => (
                    <option key={d.day} value={d.day}>
                      {d.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Start">
                <Input
                  type="time"
                  value={window.start}
                  onChange={(e) => onAvailability(replaceAt(availability, index, { ...window, start: e.target.value }))}
                />
              </Field>
              <Field label="End">
                <Input
                  type="time"
                  value={window.end}
                  onChange={(e) => onAvailability(replaceAt(availability, index, { ...window, end: e.target.value }))}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onAvailability(availability.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onAvailability([...availability, { day: 1, start: "09:00", end: "17:00" }])}
        >
          Add a window
        </Button>
      </DetailSection>
      <DetailSection title="Contact" summary={contactSummary(address, emergencyName)}>
        <AddressFields value={address} onChange={onAddress} />
        <Field label="Emergency name">
          <Input value={emergencyName} onChange={(e) => onEmergencyName(e.target.value)} />
        </Field>
        <Field label="Emergency phone">
          <PhoneInput value={emergencyPhone} onChange={onEmergencyPhone} />
        </Field>
      </DetailSection>
      <DetailSection title="Dates" summary={dateSummary(birthday, startDate)}>
        <p className="text-xs text-muted">
          Birthday and the work anniversary from the start date show on the calendar. They are markers, not appointments, and they do not block booking.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Birthday">
            <Input type="date" value={birthday} onChange={(e) => onBirthday(e.target.value)} />
          </Field>
          <Field label="Start date">
            <Input type="date" value={startDate} onChange={(e) => onStartDate(e.target.value)} />
          </Field>
        </div>
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-secondary">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="block text-sm font-medium text-navy">{title}</span>
          <span className="block truncate text-xs text-muted">{summary}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <OpenedContent>
          <div className="grid gap-3 px-3 pb-3">{children}</div>
        </OpenedContent>
      ) : null}
    </div>
  );
}

function replaceAt(rows: AvailabilityWindow[], index: number, next: AvailabilityWindow) {
  return rows.map((row, i) => (i === index ? next : row));
}

function contactSummary(address: AddressParts, emergencyName: string) {
  const place = [address.city, address.state].filter(Boolean).join(", ");
  if (place && emergencyName.trim()) return `${place} · ${emergencyName.trim()}`;
  if (place) return place;
  if (address.address_line1.trim()) return address.address_line1.trim();
  if (emergencyName.trim()) return emergencyName.trim();
  return "None";
}

function dateSummary(birthday: string, startDate: string) {
  const parts = [birthday ? `Birthday ${birthday}` : "", startDate ? `Start ${startDate}` : ""].filter(Boolean);
  return parts.join(" · ") || "None";
}
