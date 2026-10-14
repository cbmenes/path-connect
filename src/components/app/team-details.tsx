import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { availabilitySummary } from "@/lib/sweepbook/availability";
import { formatAddress, formatPhoneAsTyped, type AddressParts } from "@/lib/sweepbook/people";
import { formatPayRate, payTypeLabel, type PayType } from "@/lib/sweepbook/team-pay";
import type { AvailabilityWindow, TeamMember } from "@/lib/sweepbook/types";
import { OpenedContent } from "@/components/app/opened-content";
import { AddressFields } from "@/components/app/address-fields";
import { NameFields } from "@/components/app/name-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
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
  showAvailability = true,
  showIdentity = false,
  firstName = "",
  onFirstName,
  lastName = "",
  onLastName,
  phone = "",
  onPhone,
  email = "",
  onEmail,
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
  showAvailability?: boolean;
  showIdentity?: boolean;
  firstName?: string;
  onFirstName?: (value: string) => void;
  lastName?: string;
  onLastName?: (value: string) => void;
  phone?: string;
  onPhone?: (value: string) => void;
  email?: string;
  onEmail?: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <CollapsedSection
        title="Contact"
        summary={contactSummary(address, showIdentity ? { phone, email } : undefined)}
      >
        {showIdentity && onFirstName && onLastName ? (
          <NameFields firstName={firstName} lastName={lastName} onFirst={onFirstName} onLast={onLastName} />
        ) : null}
        {showIdentity && onPhone ? (
          <Field label="Phone">
            <PhoneInput value={phone} onChange={onPhone} />
          </Field>
        ) : null}
        {showIdentity && onEmail ? (
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => onEmail(e.target.value)} />
          </Field>
        ) : null}
        <AddressFields value={address} onChange={onAddress} />
      </CollapsedSection>
      <CollapsedSection title="Emergency contact" summary={emergencySummary(emergencyName, emergencyPhone)}>
        <Field label="Emergency name">
          <Input value={emergencyName} onChange={(e) => onEmergencyName(e.target.value)} />
        </Field>
        <Field label="Emergency phone">
          <PhoneInput value={emergencyPhone} onChange={onEmergencyPhone} />
        </Field>
      </CollapsedSection>
      <CollapsedSection title="Notes" summary={notes.trim() ? "Saved" : "None"}>
        <Field label="Notes" hint="Only the Master and Admins can see this.">
          <Textarea value={notes} onChange={(e) => onNotes(e.target.value)} />
        </Field>
      </CollapsedSection>
      {showAvailability ? (
        <CollapsedSection title="Availability" summary={availabilitySummary(availability)}>
          <AvailabilityEditor value={availability} onChange={onAvailability} />
        </CollapsedSection>
      ) : null}
      <CollapsedSection title="Dates" summary={dateSummary(birthday, startDate)}>
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
      </CollapsedSection>
    </div>
  );
}

export function TeamDetailView({ member, showPay = false }: { member: TeamMember; showPay?: boolean }) {
  const showAvailability = member.office_role !== "admin";
  const address = formatAddress(addressParts(member));
  const phone = formatPhoneAsTyped(member.phone);
  const email = member.email?.trim() || "";
  return (
    <div className="grid gap-2">
      <CollapsedSection
        title="Contact"
        summary={contactSummary(addressParts(member), { phone: member.phone ?? "", email })}
      >
        <p className="text-sm text-ink">{member.full_name}</p>
        <p className="text-sm text-ink">{phone || "No phone"}</p>
        <p className="text-sm text-ink">{email || "No email"}</p>
        <p className="text-sm text-ink">{address || "No address"}</p>
      </CollapsedSection>
      <CollapsedSection
        title="Emergency contact"
        summary={emergencySummary(member.emergency_name ?? "", member.emergency_phone ?? "")}
      >
        <p className="text-sm text-ink">{member.emergency_name?.trim() || "No emergency name"}</p>
        <p className="text-sm text-ink">{formatPhoneAsTyped(member.emergency_phone) || "No emergency phone"}</p>
      </CollapsedSection>
      <CollapsedSection title="Notes" summary={member.staff_notes?.trim() ? "Saved" : "None"}>
        <p className="whitespace-pre-wrap text-sm text-ink">{member.staff_notes?.trim() || "None"}</p>
        <p className="text-xs text-muted">Only the Master and Admins can see this.</p>
      </CollapsedSection>
      {showAvailability ? (
        <CollapsedSection title="Availability" summary={availabilitySummary(member.availability ?? [])}>
          <p className="text-sm text-ink">
            {(member.availability ?? []).length
              ? availabilitySummary(member.availability ?? [])
              : "No weekly restriction. Scheduling is not limited to a window."}
          </p>
        </CollapsedSection>
      ) : null}
      <CollapsedSection title="Dates" summary={dateSummary(member.birthday ?? "", member.start_date ?? "")}>
        <p className="text-sm text-ink">{member.birthday ? `Birthday ${prettyDate(member.birthday)}` : "No birthday"}</p>
        <p className="text-sm text-ink">
          {member.start_date ? `Start date ${prettyDate(member.start_date)}` : "No start date"}
        </p>
        <p className="text-xs text-muted">
          Birthday and the work anniversary from the start date show on the office calendar. They are markers, not appointments.
        </p>
      </CollapsedSection>
      {showPay ? (
        <CollapsedSection title="Pay rate" summary={payRateSummary(member.pay_type, member.pay_amount)}>
          <p className="text-sm text-ink">{payRateSummary(member.pay_type, member.pay_amount)}</p>
          {member.pay_note?.trim() ? <p className="text-sm text-ink">{member.pay_note.trim()}</p> : null}
          <p className="text-xs text-muted">This cleaner never sees this rate.</p>
        </CollapsedSection>
      ) : null}
    </div>
  );
}

function payRateSummary(type: PayType | undefined, amount: number | undefined) {
  const payType = type ?? "none";
  if (payType === "none") return "No rate set";
  return `${payTypeLabel(payType)} · ${formatPayRate(payType, amount ?? 0)}`;
}

function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityWindow[];
  onChange: (value: AvailabilityWindow[]) => void;
}) {
  const [days, setDays] = useState(() => [...new Set(value.map((window) => window.day))].sort((a, b) => a - b));
  const [start, setStart] = useState(value[0]?.start || "09:00");
  const [end, setEnd] = useState(value[0]?.end || "17:00");
  const [touched, setTouched] = useState(false);
  const mixed =
    !touched &&
    value.length > 1 &&
    value.some((window) => window.start !== value[0]?.start || window.end !== value[0]?.end);
  const invalid = days.length > 0 && start >= end;

  function publish(nextDays: number[], nextStart: string, nextEnd: string) {
    const ordered = [...nextDays].sort((a, b) => a - b);
    setTouched(true);
    setDays(ordered);
    if (!ordered.length) {
      onChange([]);
      return;
    }
    onChange(ordered.map((day) => ({ day, start: nextStart, end: nextEnd })));
  }

  return (
    <>
      <p className="text-xs text-muted">
        Optional weekly windows. Leave every day unchecked for no restriction. Checked days limit scheduling to the start and end time below.
      </p>
      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-4">
        {DAYS.map((d) => (
          <label key={d.day} className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={days.includes(d.day)}
              onChange={() => {
                const next = days.includes(d.day) ? days.filter((day) => day !== d.day) : [...days, d.day];
                publish(next, start, end);
              }}
            />
            {d.label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start">
          <Input
            type="time"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              publish(days, e.target.value, end);
            }}
          />
        </Field>
        <Field label="End">
          <Input
            type="time"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              publish(days, start, e.target.value);
            }}
          />
        </Field>
      </div>
      {mixed ? (
        <p className="text-xs text-muted">
          Saved days use more than one time. Checking a day or changing these times applies one start and end to every checked day.
        </p>
      ) : null}
      {invalid ? <p className="text-xs text-danger">End time must be after the start time.</p> : null}
      <Button
        type="button"
        variant="ghost"
        disabled={!days.length}
        onClick={() => {
          setStart("09:00");
          setEnd("17:00");
          publish([], "09:00", "17:00");
        }}
      >
        Clear
      </Button>
    </>
  );
}

function addressParts(member: TeamMember): AddressParts {
  return {
    address_line1: member.address_line1 ?? "",
    address_line2: member.address_line2 ?? "",
    city: member.city ?? "",
    state: member.state ?? "",
    zip: member.zip ?? "",
  };
}

function prettyDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function CollapsedSection({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
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

function contactSummary(address: AddressParts, identity?: { phone?: string; email?: string }) {
  const phone = formatPhoneAsTyped(identity?.phone);
  if (phone) return phone;
  if (identity?.email?.trim()) return identity.email.trim();
  const place = [address.city, address.state].filter(Boolean).join(", ");
  if (place) return place;
  if (address.address_line1.trim()) return address.address_line1.trim();
  return "None";
}

function emergencySummary(name: string, phone: string) {
  const who = name.trim();
  const formatted = formatPhoneAsTyped(phone);
  if (who && formatted) return `${who} · ${formatted}`;
  return who || formatted || "None";
}

function dateSummary(birthday: string, startDate: string) {
  const parts = [birthday ? `Birthday ${birthday}` : "", startDate ? `Start ${startDate}` : ""].filter(Boolean);
  return parts.join(" · ") || "None";
}
