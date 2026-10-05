import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AddressFields } from "@/components/app/address-fields";
import { NameFields } from "@/components/app/name-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { getPublicBookInfo, submitCleanRequest } from "@/lib/sweepbook/requests";
import { emptyAddress } from "@/lib/sweepbook/people";
import { chicagoDateInputValue } from "@/lib/sweepbook/time";
import type { CleanServiceType } from "@/lib/sweepbook/types";

export const Route = createFileRoute("/request/$slug")({ component: RequestCleanPage });

function RequestCleanPage() {
  const { slug } = Route.useParams();
  const info = useQuery({
    queryKey: ["public-book", slug],
    queryFn: () => getPublicBookInfo({ data: { slug } }),
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress());
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFootage, setSquareFootage] = useState("");
  const [serviceType, setServiceType] = useState<CleanServiceType>("one-time");
  const [preferredDate, setPreferredDate] = useState(chicagoDateInputValue());
  const [preferredTime, setPreferredTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const business = info.data?.businessName;
  const ready = Boolean(info.data && !info.error);

  return (
    <SiteChrome>
      <div className="mx-auto max-w-lg px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage">Booking request</p>
        <h1 className="mt-2 font-display text-4xl text-navy">{ready ? business : "Booking form"}</h1>
        <p className="mt-2 text-muted">
          {ready
            ? "Tell us when you would like the house cleaned. This is a request — it is not on the calendar until the office accepts it. Nothing is charged from this form."
            : "This public booking form is unique to each company."}
        </p>
        {info.isPending ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-secondary" />
        ) : info.error || !info.data ? (
          <p className="mt-8 rounded-xl bg-danger/10 p-5 text-danger">
            {(info.error as Error | undefined)?.message || "This booking link is not valid."}
          </p>
        ) : sent ? (
          <div className="mt-8 rounded-xl bg-sage-soft p-5">
            <p className="font-medium text-navy">Request sent.</p>
            <p className="mt-1 text-sm text-muted">
              The office will review it and get back to you. No visit has been booked yet.
            </p>
            <Button className="mt-4" variant="outline" asChild>
              <Link to="/">Back home</Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-8 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await submitCleanRequest({
                  data: {
                    slug,
                    firstName,
                    lastName,
                    phone,
                    email,
                    address_line1: address.address_line1,
                    address_line2: address.address_line2,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    bedrooms,
                    bathrooms,
                    squareFootage,
                    serviceType,
                    preferredDate,
                    preferredTime,
                    notes,
                  },
                });
                setSent(true);
                toast.success("Request sent.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not send the request.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
            <Field label="Phone">
              <PhoneInput value={phone} onChange={setPhone} required />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <AddressFields value={address} onChange={setAddress} required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bedrooms" hint="Optional">
                <Input type="number" min={0} inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
              </Field>
              <Field label="Bathrooms" hint="Optional">
                <Input type="number" min={0} step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
              </Field>
              <Field label="Square footage" hint="Optional">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={squareFootage}
                  onChange={(e) => setSquareFootage(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Service type">
              <NativeSelect
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as CleanServiceType)}
              >
                <option value="one-time">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every other week</option>
                <option value="monthly">Monthly</option>
              </NativeSelect>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred date">
                <Input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </Field>
              <Field label="Preferred time">
                <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes" hint="Pets, access, or anything we should know.">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </Field>
            <Button type="submit" disabled={busy || info.isPending}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </form>
        )}
      </div>
    </SiteChrome>
  );
}
