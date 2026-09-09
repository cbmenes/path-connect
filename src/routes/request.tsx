import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getPublicBookInfo, submitCleanRequest } from "@/lib/sweepbook/requests";
import { chicagoDateInputValue } from "@/lib/sweepbook/time";
import type { CleanServiceType } from "@/lib/sweepbook/types";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/request")({ component: RequestCleanPage });

function RequestCleanPage() {
  const info = useQuery({ queryKey: ["public-book"], queryFn: () => getPublicBookInfo() });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serviceType, setServiceType] = useState<CleanServiceType>("one-time");
  const [preferredDate, setPreferredDate] = useState(chicagoDateInputValue());
  const [preferredTime, setPreferredTime] = useState("10:00");

  const business = info.data?.businessName || "SweepBook";

  return (
    <SiteChrome>
      <div className="mx-auto max-w-lg px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage">Request a clean</p>
        <h1 className="mt-2 font-display text-4xl text-navy">{business}</h1>
        <p className="mt-2 text-muted">
          Tell us when you would like the house cleaned. This is a request — it is not on the calendar until the office
          accepts it. Nothing is charged from this form.
        </p>
        {info.error ? (
          <p className="mt-8 rounded-xl bg-danger/10 p-5 text-danger">{(info.error as Error).message}</p>
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
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              try {
                await submitCleanRequest({
                  data: {
                    name: String(fd.get("name") || ""),
                    phone: String(fd.get("phone") || ""),
                    email: String(fd.get("email") || ""),
                    address: String(fd.get("address") || ""),
                    serviceType,
                    preferredDate,
                    preferredTime,
                    notes: String(fd.get("notes") || ""),
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
            <Field label="Name">
              <Input name="name" autoComplete="name" required />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" autoComplete="tel" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Address">
              <Input name="address" autoComplete="street-address" required />
            </Field>
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
              <Textarea name="notes" rows={4} />
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
