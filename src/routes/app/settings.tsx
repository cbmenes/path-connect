import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/brand";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { updateSettings } from "@/lib/sweepbook/dashboard";
import { getReminderStatus, updateReminderSettings } from "@/lib/sweepbook/reminders";
import { ReminderTestButton } from "@/components/app/reminder-test-button";
import {
  addBillingAch,
  addBillingCard,
  listBillingMethods,
  removeBillingMethod,
  setDefaultBillingMethod,
  updateAccount,
} from "@/lib/sweepbook/billing";
import { extraAdminQuantity, includedAdminSeats, intervalTotalCents } from "@/lib/sweepbook/extra-admin";
import {
  beginStripeConnect,
  cancelSaasPlan,
  changeSaasPlan,
  disconnectStripeAccount,
  getSaasPlan,
  listSubscriptionInvoices,
  openBillingPortal,
  openStripeAccount,
  periodStillOpen,
  resumeSaasPlan,
  type BillingInterval,
  type SaasPlanCode,
} from "@/lib/sweepbook/plan";
import { listCardsForClient } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { addressPartsFrom, emptyAddress, namesFrom } from "@/lib/sweepbook/people";
import { formatDate, money } from "@/lib/sweepbook/time";
import { CardForm } from "@/components/app/card-form";
import { EmbeddedCheckoutForm } from "@/components/app/embedded-checkout";
import { CardManager } from "@/components/app/card-manager";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/empty-state";
import { AddressFields } from "@/components/app/address-fields";
import { NameFields } from "@/components/app/name-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "profile" | "account" | "billing" | "plan";

export const Route = createFileRoute("/app/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; connect?: "refresh" } => ({
    tab: s.tab === "account" || s.tab === "billing" || s.tab === "plan" || s.tab === "profile" ? s.tab : undefined,
    connect: s.connect === "refresh" ? "refresh" : undefined,
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { tab = "profile" } = Route.useSearch();
  const q = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const kind = q.data?.kind;
  const tabs: Tab[] =
    kind === "cleaner" || kind === "admin"
      ? ["profile", "account", "plan"]
      : kind === "client"
        ? ["profile", "account", "billing"]
        : ["profile", "account"];
  const active: Tab = tabs.includes(tab) ? tab : "profile";

  function tabLabel(t: Tab) {
    if (t === "profile") return kind === "cleaner" ? "Profile" : "Contact";
    if (t === "account") return kind === "cleaner" ? "Account" : "Login";
    if (t === "plan") return "Billing";
    return "Billing";
  }

  if (q.isPending) return <div className="h-32 animate-pulse rounded-xl bg-secondary" />;
  if (kind !== "cleaner" && kind !== "admin" && kind !== "team" && kind !== "client") {
    return <p className="text-muted">Sign in to manage settings.</p>;
  }

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <PageHeader title="Settings" />
      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {tabs.map((t) => (
          <Link
            key={t}
            to="/app/settings"
            search={{ tab: t }}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm",
              active === t ? "bg-paper text-navy shadow-soft" : "text-muted",
            )}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </div>
      {active === "profile" ? (
        kind === "cleaner" ? (
          <>
            <MasterProfileSection />
            <BookingFormLink />
            <ChecklistsLink />
            <MasterReminderSettings />
          </>
        ) : kind === "admin" || kind === "team" ? (
          <>
            <TeamProfileSection />
            {kind === "admin" ? (
              <>
                <BookingFormLink />
                <ChecklistsLink />
              </>
            ) : null}
          </>
        ) : (
          <>
            <ClientProfileSection />
            <ClientReminderSettings />
          </>
        )
      ) : active === "account" ? (
        <AccountSection />
      ) : active === "plan" ? (
        kind === "admin" ? <AdminPlanNote /> : <PlanSection />
      ) : kind === "client" ? (
        <ClientBillingSection />
      ) : null}
    </div>
  );
}

function ChecklistsLink() {
  return (
    <Card className="grid gap-2">
      <h2 className="font-display text-lg text-navy">Job checklists</h2>
      <p className="text-sm text-muted">
        Templates, who on the team can see them, and each client’s default. Checking a visit does not change the template.
      </p>
      <Button variant="outline" asChild>
        <Link to="/app/checklists">Open checklists</Link>
      </Button>
    </Card>
  );
}

function BookingFormLink() {
  return (
    <Card className="grid gap-2">
      <h2 className="font-display text-lg text-navy">Booking Form / Requests</h2>
      <p className="text-sm text-muted">
        Your public booking URL and incoming requests live on the Booking Form / Requests tab — not only here.
      </p>
      <Button variant="outline" asChild>
        <Link to="/app/requests">Open Booking Form / Requests</Link>
      </Button>
    </Card>
  );
}

function MasterProfileSection() {
  const q = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const profile = q.data?.kind === "cleaner" ? q.data.profile : null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress());
  const [policy, setPolicy] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const names = namesFrom(profile.first_name, profile.last_name, profile.full_name);
    setFirstName(names.first_name);
    setLastName(names.last_name);
    setBusiness(profile.business_name ?? "");
    setPhone(profile.phone ?? "");
    setEmail(profile.email ?? "");
    setAddress(addressPartsFrom(profile));
    setPolicy(profile.cancellation_policy ?? "");
  }, [profile]);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateSettings({
            data: {
              firstName,
              lastName,
              businessName: business,
              phone,
              email,
              ...address,
              cancellationPolicy: policy,
            },
          });
          toast.success("Profile saved.");
          await qc.invalidateQueries({ queryKey: ["actor"] });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
      <Field label="Business name">
        <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
      </Field>
      <Field label="Phone">
        <PhoneInput value={phone} onChange={setPhone} />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <AddressFields value={address} onChange={setAddress} />
      <Field label="Cancellation policy" hint="Shown when a client attempts to cancel appointment.">
        <Textarea value={policy} onChange={(e) => setPolicy(e.target.value)} rows={4} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function MasterReminderSettings() {
  const q = useQuery({ queryKey: ["reminder-status"], queryFn: () => getReminderStatus() });
  const qc = useQueryClient();
  const [emailOn, setEmailOn] = useState(true);
  const [teamOn, setTeamOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setEmailOn(q.data.emailReminders);
    setTeamOn(q.data.reminderEmailTeam);
  }, [q.data]);

  return (
    <Card className="grid gap-3">
      <div>
        <h2 className="font-display text-lg text-navy">Email reminders</h2>
        <p className="mt-1 text-sm text-muted">
          When on, {APP_NAME} emails the client 24 hours before a scheduled visit. Cancelled visits are never emailed.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={emailOn}
          onChange={(e) => setEmailOn(e.target.checked)}
        />
        <span>Email reminders to clients 24 hours before a visit</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={teamOn}
          disabled={!emailOn}
          onChange={(e) => setTeamOn(e.target.checked)}
        />
        <span>Also email assigned team cleaner(s) 24 hours before (no prices)</span>
      </label>
      {!q.data?.mailConfigured ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted">
          Email is not configured yet. Reminders are still queued. Add RESEND_API_KEY on the host to send for real.
        </p>
      ) : (
        <p className="text-xs text-muted">Sending from {q.data.fromEmail}.</p>
      )}
      <p className="text-xs text-muted">{q.data?.note}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await updateReminderSettings({
                data: { emailReminders: emailOn, reminderEmailTeam: teamOn },
              });
              toast.success("Reminder settings saved.");
              await qc.invalidateQueries({ queryKey: ["reminder-status"] });
              await qc.invalidateQueries({ queryKey: ["actor"] });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save reminders"}
        </Button>
        <ReminderTestButton />
      </div>
    </Card>
  );
}

function ClientReminderSettings() {
  const q = useQuery({ queryKey: ["reminder-status"], queryFn: () => getReminderStatus() });
  const qc = useQueryClient();
  const [emailOn, setEmailOn] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setEmailOn(q.data.emailReminders);
  }, [q.data]);

  return (
    <Card className="grid gap-3">
      <div>
        <h2 className="font-display text-lg text-navy">Email reminders</h2>
        <p className="mt-1 text-sm text-muted">
          Hear from your cleaner 24 hours before a scheduled visit. Turn this off to stop reminder emails.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={emailOn}
          onChange={(e) => setEmailOn(e.target.checked)}
        />
        <span>Email me a reminder 24 hours before my visits</span>
      </label>
      <Button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await updateReminderSettings({ data: { emailReminders: emailOn } });
            toast.success("Reminder preference saved.");
            await qc.invalidateQueries({ queryKey: ["reminder-status"] });
            await qc.invalidateQueries({ queryKey: ["actor"] });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save reminders"}
      </Button>
    </Card>
  );
}

function TeamProfileSection() {
  const q = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const profile = q.data?.kind === "team" || q.data?.kind === "admin" ? q.data.profile : null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const names = namesFrom(profile.first_name, profile.last_name, profile.full_name);
    setFirstName(names.first_name);
    setLastName(names.last_name);
    setPhone(profile.phone ?? "");
    setEmail(profile.email ?? "");
  }, [profile]);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateSettings({ data: { firstName, lastName, phone, email } });
          toast.success("Contact saved.");
          await qc.invalidateQueries({ queryKey: ["actor"] });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
      <Field label="Phone">
        <PhoneInput value={phone} onChange={setPhone} />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save contact"}
      </Button>
    </form>
  );
}

function ClientProfileSection() {
  const q = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const qc = useQueryClient();
  const profile = q.data?.kind === "client" ? q.data.profile : null;
  const client = q.data?.kind === "client" ? q.data.client : null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const names = namesFrom(profile.first_name || client?.first_name, profile.last_name || client?.last_name, profile.full_name);
    setFirstName(names.first_name);
    setLastName(names.last_name);
    setPhone(profile.phone ?? client?.phone ?? "");
    setEmail(profile.email ?? client?.email ?? "");
    setAddress(addressPartsFrom(profile.address_line1 ? profile : client));
  }, [profile, client]);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateSettings({ data: { firstName, lastName, phone, email, ...address } });
          toast.success("Contact saved.");
          await qc.invalidateQueries({ queryKey: ["actor"] });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
      <Field label="Phone">
        <PhoneInput value={phone} onChange={setPhone} />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <AddressFields value={address} onChange={setAddress} />
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save contact"}
      </Button>
    </form>
  );
}

function AccountSection() {
  const user = useCurrentUser();
  const [email, setEmail] = useState(user?.primaryEmail ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(user?.primaryEmail ?? "");
  }, [user?.primaryEmail]);

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await updateAccount({ data: { email } });
            toast.success("Login email updated.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not update email.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Username / login email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={busy}>
          Save login email
        </Button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (next.length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
          }
          if (next !== confirm) {
            toast.error("New passwords do not match.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await authClient.changePassword({
              currentPassword: current,
              newPassword: next,
            });
            if (error) throw new Error(error.message || "Could not change password.");
            toast.success("Password updated.");
            setCurrent("");
            setNext("");
            setConfirm("");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change password.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-display text-lg text-navy">Change password</h2>
        <Field label="Current password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={busy}>
          Update password
        </Button>
      </form>
    </div>
  );
}

function ClientBillingSection() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const clientId = actor.data?.kind === "client" ? actor.data.client.id : "";
  const cards = useQuery({
    queryKey: ["cards", clientId],
    queryFn: () => listCardsForClient({ data: clientId }),
    enabled: Boolean(clientId),
  });
  const qc = useQueryClient();
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        The default card is used to pay your cleaner. We keep brand and last four only.
      </p>
      {clientId ? (
        <CardManager
          clientId={clientId}
          cards={cards.data ?? []}
          source="client"
          onChange={async () => {
            await qc.invalidateQueries({ queryKey: ["cards"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      ) : null}
    </div>
  );
}

function planDollars(cents: number) {
  const dollars = (cents || 0) / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : money(cents);
}

function paidThroughLabel(iso: string) {
  return formatDate(iso, { month: "long", day: "numeric", year: "numeric" });
}

function AdminPlanNote() {
  return (
    <Card>
      <h2 className="font-display text-lg text-navy">Plan</h2>
      <p className="mt-2 text-sm text-muted">Billing is Master-only.</p>
    </Card>
  );
}

function ClientCardsScroll() {
  useEffect(() => {
    if (window.location.hash !== "#client-cards") return;
    document.getElementById("client-cards")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  return null;
}

function invoiceStatusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "open") return "Open";
  if (status === "void") return "Void";
  if (status === "uncollectible") return "Unpaid";
  if (status === "draft") return "Draft";
  return status;
}

function BillingHistory() {
  const q = useQuery({ queryKey: ["subscription-invoices"], queryFn: () => listSubscriptionInvoices() });
  return (
    <Card>
      <h2 className="font-display text-lg text-navy">Billing history</h2>
      <p className="mt-1 text-sm text-muted">Subscription charges for this CrewWeek account.</p>
      {q.isPending ? <div className="mt-3 h-16 animate-pulse rounded-lg bg-secondary" /> : null}
      {q.isError ? (
        <p className="mt-3 text-sm text-danger">{q.error instanceof Error ? q.error.message : "Billing history is unavailable right now."}</p>
      ) : null}
      {q.data?.demo ? <p className="mt-3 text-sm text-muted">Demo accounts are not charged.</p> : null}
      {q.data && !q.data.demo && q.data.invoices.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No subscription charges yet.</p>
      ) : null}
      {q.data && q.data.invoices.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {q.data.invoices.map((invoice) => (
            <li key={invoice.id} className="flex items-start justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-ink">{invoice.number || "Subscription"}</p>
                <p className="text-xs text-muted">
                  {formatDate(new Date(invoice.created * 1000), { month: "short", day: "numeric", year: "numeric" })} · {invoiceStatusLabel(invoice.status)}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-navy">{money(invoice.amountCents)}</p>
                {invoice.hostedUrl ? (
                  <a className="text-xs text-navy underline-offset-4 hover:underline" href={invoice.hostedUrl} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function PlanSection() {
  const { connect } = Route.useSearch();
  const q = useQuery({ queryKey: ["saas-plan"], queryFn: () => getSaasPlan() });
  const qc = useQueryClient();
  const [changeOpen, setChangeOpen] = useState(false);
  const [draftCode, setDraftCode] = useState<SaasPlanCode>("crew");
  const [draftInterval, setDraftInterval] = useState<BillingInterval>("month");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const plan = q.data?.access === "master" ? q.data : null;
  const code = plan?.code === "office" ? "office" : "crew";
  const interval: BillingInterval = plan?.interval === "year" ? "year" : "month";
  const name = code === "office" ? "Office Plan" : "Crew Plan";
  const price = interval === "year" ? (code === "office" ? "$790/year" : "$390/year") : code === "office" ? "$79/mo" : "$39/mo";
  const renewalStops = Boolean(
    plan?.periodEnd &&
      periodStillOpen(plan.periodEnd) &&
      (plan.cancelAtPeriodEnd || plan.status === "canceled"),
  );
  const adminCount = plan?.adminCount ?? 0;
  const draftIncluded = includedAdminSeats(draftCode);
  const draftExtra = extraAdminQuantity(adminCount, draftCode);
  const draftCents = intervalTotalCents(draftCode, draftExtra, draftInterval);
  const draftName = draftCode === "office" ? "Office Plan" : "Crew Plan";
  const statusLabel = renewalStops
    ? "Active"
    : plan?.status === "canceled"
      ? "Canceled"
      : plan?.status === "active"
        ? "Active"
        : plan?.status === "pending"
          ? "Pending"
          : plan?.status === "past_due"
            ? "Past due"
            : "Not started";

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["saas-plan"] });
    await qc.invalidateQueries({ queryKey: ["actor"] });
  }

  useEffect(() => {
    if (connect !== "refresh" || !plan?.showConnect) return;
    let stop = false;
    setConnectBusy(true);
    beginStripeConnect({ data: {} })
      .then((res) => {
        if (!stop) window.location.assign(res.url);
      })
      .catch((err) => {
        if (stop) return;
        toast.error(err instanceof Error ? err.message : "Could not open Stripe.");
        setConnectBusy(false);
      });
    return () => {
      stop = true;
    };
  }, [connect, plan?.showConnect]);

  if (q.isPending) return <div className="h-32 animate-pulse rounded-xl bg-secondary" />;
  if (q.data?.access === "locked") return <AdminPlanNote />;
  if (!plan) return <p className="text-sm text-muted">Billing is Master-only.</p>;

  return (
    <div className="grid gap-4">
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-sage">Current plan</p>
        <p className="mt-1 font-display text-2xl text-navy">
          {name} · {price}
        </p>
        <p className="mt-2 text-sm text-ink">
          {code === "office"
            ? "Includes 1 Admin and Team pay, which tracks what is owed to cleaners."
            : "Owner account with unlimited Team and Clients."}
        </p>
        <p className="mt-1 text-sm text-muted">Mark as Paid is available on the Crew Plan and the Office Plan.</p>
        <p className="text-sm text-muted">{statusLabel}</p>
        <dl className="mt-3 grid gap-1 text-sm text-ink">
          <div className="flex justify-between gap-4">
            <dt>Included Admin</dt>
            <dd className="tabular">{plan.includedAdmins}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Paid extra seats</dt>
            <dd className="tabular">
              {plan.extraAdmins} × {interval === "year" ? "$190/year" : "$19/mo"}
            </dd>
          </div>
          {interval === "month" ? (
            <div className="flex justify-between gap-4 font-medium">
              <dt>Monthly amount</dt>
              <dd className="tabular">{planDollars(plan.monthlyCents)}/mo</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 font-medium">
            <dt>Annual amount</dt>
            <dd className="tabular">{planDollars(plan.annualCents)}/year</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink">Annual billing is two months free.</p>
        {plan.demo && !renewalStops ? (
          <>
            <p className="mt-1 text-sm text-muted">Demo accounts are not charged.</p>
            <p className="mt-1 text-sm text-muted">Paid through: not billed.</p>
          </>
        ) : plan.periodEnd ? (
          <p className="mt-1 text-sm text-ink">Paid through {paidThroughLabel(plan.periodEnd)}.</p>
        ) : (
          <p className="mt-1 text-sm text-muted">Paid through date appears after Stripe confirms the subscription.</p>
        )}
        {renewalStops ? (
          <p className="mt-1 text-sm text-ink">Renewal is off. The current month or year is not refunded.</p>
        ) : null}
        {plan.demo && renewalStops ? (
          <p className="mt-1 text-sm text-muted">Demo accounts are not charged.</p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          The owner subscription is confirmed by Stripe. Extra Admin stays a quantity on the same interval and is not a Checkout item.
        </p>
        {plan.stripeCustomer ? (
          <div className="mt-4 grid gap-2">
            <Button
              variant="outline"
              disabled={portalBusy}
              onClick={async () => {
                setPortalBusy(true);
                try {
                  const portal = await openBillingPortal({ data: {} });
                  window.location.assign(portal.url);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not open Stripe.");
                  setPortalBusy(false);
                }
              }}
            >
              {portalBusy ? "Opening Stripe…" : "Manage payment method"}
            </Button>
            <p className="text-xs text-muted">Stripe replaces the card for this subscription. CrewWeek does not collect the number.</p>
          </div>
        ) : null}
      </Card>
      <BillingHistory />
      {plan.demo && !plan.showConnect ? (
        <Card id="client-cards" className="scroll-mt-6">
          <ClientCardsScroll />
          <p className="text-xs uppercase tracking-[0.14em] text-sage">Client cards</p>
          <p className="mt-2 text-sm text-ink">Demo accounts are not charged.</p>
        </Card>
      ) : null}
      {plan.showConnect ? (
        <Card id="client-cards" className="scroll-mt-6">
          <ClientCardsScroll />
          <p className="text-xs uppercase tracking-[0.14em] text-sage">Client cards</p>
          {plan.connectStatus === "ready" ? (
            <>
              <p className="mt-1 font-display text-2xl text-navy">Connected</p>
              <p className="mt-2 text-sm text-muted">Card payments are enabled. A saved client card is charged on this Stripe account. Stripe collects the first card. The payout belongs to this cleaning company.</p>
            </>
          ) : plan.connectStatus === "incomplete" ? (
            <>
              <p className="mt-1 font-display text-2xl text-navy">Setup incomplete</p>
              <p className="mt-2 text-sm text-muted">
                Stripe has not enabled card payments on this account. A restricted account cannot charge. Finish setup before charging a card.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink">
              Connect a Stripe account for this cleaning company before charging a client card.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.connectStatus === "ready" ? (
              <Button
                variant="outline"
                disabled={connectBusy || disconnectBusy}
                onClick={async () => {
                  setConnectBusy(true);
                  try {
                    const opened = await openStripeAccount({ data: {} });
                    window.location.assign(opened.url);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not open Stripe.");
                    setConnectBusy(false);
                  }
                }}
              >
                {connectBusy ? "Opening Stripe…" : "Open Stripe account"}
              </Button>
            ) : (
              <Button
                disabled={connectBusy || disconnectBusy}
                onClick={async () => {
                  setConnectBusy(true);
                  try {
                    const link = await beginStripeConnect({ data: {} });
                    window.location.assign(link.url);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not connect Stripe.");
                    setConnectBusy(false);
                  }
                }}
              >
                {connectBusy ? "Opening Stripe…" : plan.connectStatus === "incomplete" ? "Continue Stripe setup" : "Connect Stripe"}
              </Button>
            )}
            {plan.connectStatus === "none" ? null : (
              <Button variant="danger" disabled={connectBusy || disconnectBusy} onClick={() => setDisconnectOpen(true)}>
                Disconnect Stripe
              </Button>
            )}
          </div>
          {plan.connectStatus === "none" ? null : (
            <ConfirmDialog
              open={disconnectOpen}
              onOpenChange={setDisconnectOpen}
              title="Disconnect Stripe?"
              body="CrewWeek forgets this connected account. Connect Stripe starts a new one."
              confirmLabel="Disconnect Stripe"
              busy={disconnectBusy}
              busyLabel="Disconnecting…"
              onConfirm={async () => {
                setDisconnectBusy(true);
                try {
                  await disconnectStripeAccount({ data: {} });
                  setDisconnectOpen(false);
                  await refresh();
                  toast.success("Stripe disconnected");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not disconnect Stripe.");
                } finally {
                  setDisconnectBusy(false);
                }
              }}
            />
          )}
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {plan.status === "canceled" || plan.status === "pending" || renewalStops || plan.periodEnded ? (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const resumed = await resumeSaasPlan({ data: {} });
                if (resumed.checkout) {
                  setCheckout(resumed.checkout);
                  return;
                }
                await refresh();
                toast.success(renewalStops ? "Renewal is back on" : `${name} resumed`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not resume the plan.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {renewalStops ? "Resume renewal" : "Resume plan"}
          </Button>
        ) : null}
        {checkout ? (
          <div className="basis-full">
            <EmbeddedCheckoutForm clientSecret={checkout.clientSecret} publishableKey={checkout.publishableKey} />
          </div>
        ) : null}
        {plan.status === "active" && !plan.periodEnded ? (
          <Button
            variant="outline"
            onClick={() => {
              setDraftCode(code);
              setDraftInterval(interval);
              setChangeOpen(true);
            }}
            disabled={busy}
          >
            Change plan
          </Button>
        ) : null}
        {plan.status === "active" && !renewalStops && !plan.periodEnded ? (
          <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={busy}>
            Cancel plan
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        title="Change plan?"
        body={
          plan.demo
            ? `${draftName}, ${draftInterval === "year" ? "annual" : "monthly"}. Included Admin: ${draftIncluded}. Paid extra seats: ${draftExtra}. Amount ${planDollars(draftCents)}${draftInterval === "year" ? "/year" : "/mo"}. Demo accounts are not charged.`
            : `${draftName}, ${draftInterval === "year" ? "annual" : "monthly"}. Included Admin: ${draftIncluded}. Paid extra seats: ${draftExtra}. Amount ${planDollars(draftCents)}${draftInterval === "year" ? "/year" : "/mo"}. Switching interval moves the plan price and the Extra Admin price together.`
        }
        confirmLabel="Save plan"
        confirmVariant="primary"
        busy={busy}
        busyLabel="Saving…"
        onConfirm={async () => {
          setBusy(true);
          try {
            await changeSaasPlan({ data: { code: draftCode, interval: draftInterval } });
            setChangeOpen(false);
            await refresh();
            toast.success(`Switched to ${draftName}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change the plan.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {(["crew", "office"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className={
                  draftCode === choice
                    ? "min-h-11 rounded-xl bg-navy px-3 text-sm text-paper"
                    : "min-h-11 rounded-xl bg-secondary px-3 text-sm text-ink"
                }
                onClick={() => setDraftCode(choice)}
              >
                {choice === "office" ? "Office Plan" : "Crew Plan"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["month", "year"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className={
                  draftInterval === choice
                    ? "min-h-11 rounded-xl bg-navy px-3 text-sm text-paper"
                    : "min-h-11 rounded-xl bg-secondary px-3 text-sm text-ink"
                }
                onClick={() => setDraftInterval(choice)}
              >
                {choice === "year" ? "Annual" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel plan?"
        body={
          plan.demo
            ? "Demo accounts are not charged. Renewal stops at the end of the paid period. The plan stays available until that date."
            : "Renewal stops at the end of the paid period. The current month or year is not refunded. The plan stays available until that date."
        }
        confirmLabel="Stop renewal"
        busy={busy}
        busyLabel="Saving…"
        onConfirm={async () => {
          setBusy(true);
          try {
            await cancelSaasPlan({ data: {} });
            setCancelOpen(false);
            await refresh();
            toast.success("Renewal is off");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not cancel the plan.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function BillingSection() {
  const q = useQuery({ queryKey: ["billing"], queryFn: () => listBillingMethods() });
  const qc = useQueryClient();
  const [mode, setMode] = useState<"card" | "ach" | null>(null);
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const status = q.data?.planStatus ?? "trial";
  const removingMethod = (q.data?.methods ?? []).find((m) => m.id === removeId);

  return (
    <div className="grid gap-4">
      <Card>
        <p className="text-xs uppercase tracking-[0.14em] text-sage">{APP_NAME} plan</p>
        <p className="mt-1 font-display text-2xl text-navy">Crew Plan $39/mo or $390/year · Office Plan $79/mo or $790/year</p>
        <p className="text-sm capitalize text-muted">{status === "past_due" ? "Past due" : status}</p>
        <p className="mt-2 text-xs text-muted">
          Public price for the software. This screen does not start a subscription. Cards saved here stay separate from cards used to charge clients.
        </p>
      </Card>
      <div className="grid gap-2">
        {(q.data?.methods ?? []).map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {m.kind === "ach" ? m.bank_name || "Bank" : brandLabel(m.brand || "card")} · {m.last4}
              </p>
              <p className="text-xs text-muted">{m.is_default ? `Default for ${APP_NAME}` : m.kind === "ach" ? "ACH" : "Card"}</p>
            </div>
            <div className="flex gap-2">
              {!m.is_default ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await setDefaultBillingMethod({ data: m.id });
                    await qc.invalidateQueries({ queryKey: ["billing"] });
                  }}
                >
                  Set default
                </Button>
              ) : (
                <span className="rounded-full bg-sage-soft px-2 py-1 text-xs text-success">Default</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => setRemoveId(m.id)}>
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setMode("card")}>
          Add card
        </Button>
        <Button variant="outline" onClick={() => setMode("ach")}>
          Add ACH / bank
        </Button>
      </div>
      {mode === "card" ? (
        <Card>
          <CardForm
            submitLabel={`Save ${APP_NAME} card`}
            onSubmit={async (payload) => {
              await addBillingCard({
                data: {
                  number: payload.number,
                  expMonth: payload.expMonth,
                  expYear: payload.expYear,
                  holderName: payload.holderName,
                },
              });
              toast.success("Card saved.");
              setMode(null);
              await qc.invalidateQueries({ queryKey: ["billing"] });
            }}
          />
        </Card>
      ) : null}
      {mode === "ach" ? (
        <Card>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await addBillingAch({
                  data: { routing, account, holderName: holder, bankName: bank },
                });
                toast.success("Bank account saved.");
                setMode(null);
                setRouting("");
                setAccount("");
                await qc.invalidateQueries({ queryKey: ["billing"] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save.");
              }
            }}
          >
            <div className="rounded-md bg-navy px-3 py-2 text-xs text-primary-foreground">TEST MODE · We keep last four only.</div>
            <Field label="Name on account">
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} required />
            </Field>
            <Field label="Bank name">
              <Input value={bank} onChange={(e) => setBank(e.target.value)} />
            </Field>
            <Field label="Routing number">
              <Input inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))} required />
            </Field>
            <Field label="Account number">
              <Input inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 17))} required />
            </Field>
            <Button type="submit">Save bank account</Button>
          </form>
        </Card>
      ) : null}
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title="Remove card?"
        body={`Are you sure you want to remove ${removingMethod?.kind === "ach" ? removingMethod.bank_name || "bank" : brandLabel(removingMethod?.brand || "card")} ••••${removingMethod?.last4 ?? ""}? This cannot be undone.`}
        busy={removing}
        onConfirm={async () => {
          if (!removeId) return;
          setRemoving(true);
          try {
            await removeBillingMethod({ data: removeId });
            setRemoveId(null);
            await qc.invalidateQueries({ queryKey: ["billing"] });
          } finally {
            setRemoving(false);
          }
        }}
      />
    </div>
  );
}
