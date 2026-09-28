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
import { cancelSaasPlan, changeSaasPlan, getSaasPlan, planCodeFromCents, resumeSaasPlan } from "@/lib/sweepbook/plan";
import { listCardsForClient } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { addressPartsFrom, emptyAddress, namesFrom } from "@/lib/sweepbook/people";
import { CardForm } from "@/components/app/card-form";
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
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "account" || s.tab === "billing" || s.tab === "plan" || s.tab === "profile" ? s.tab : undefined,
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
      <Field label="Cancellation policy" hint="Shown when a client cancels inside 24 hours.">
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

function renewalLabel() {
  const day = new Date();
  day.setDate(day.getDate() + 30);
  return day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function AdminPlanNote() {
  return (
    <Card>
      <h2 className="font-display text-lg text-navy">Plan</h2>
      <p className="mt-2 text-sm text-muted">Billing is Master-only.</p>
    </Card>
  );
}

function PlanSection() {
  const q = useQuery({ queryKey: ["saas-plan"], queryFn: () => getSaasPlan() });
  const qc = useQueryClient();
  const [changeOpen, setChangeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const plan = q.data?.access === "master" ? q.data : null;
  const code = plan ? planCodeFromCents(plan.priceCents) : "crew";
  const name = code === "office" ? "Office" : "Crew";
  const price = code === "office" ? "$79/mo" : "$39/mo";
  const nextCode = code === "office" ? "crew" : "office";
  const nextName = nextCode === "office" ? "Office" : "Crew";
  const nextPrice = nextCode === "office" ? "$79/mo" : "$39/mo";
  const statusLabel = plan?.status === "canceled" ? "Canceled" : plan?.status === "active" ? "Active (demo)" : "Not started";

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["saas-plan"] });
    await qc.invalidateQueries({ queryKey: ["actor"] });
  }

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
        <p className="text-sm text-muted">{statusLabel}</p>
        {plan.status === "active" ? <p className="mt-2 text-sm text-ink">Next renewal {renewalLabel()}</p> : null}
        {code === "office" ? (
          <p className="mt-2 text-sm text-muted">Extra Admin — $19/mo. Line item only. Not a seat you can buy here.</p>
        ) : (
          <p className="mt-2 text-sm text-muted">No extra Admin seats on Crew.</p>
        )}
        <p className="mt-3 text-xs text-muted">Card billing will be enabled on getcrewweek.com. This is a dry run.</p>
        <p className="mt-1 text-xs text-muted">Annual is 2 months free later. This demo stays monthly.</p>
      </Card>
      {plan.status === "canceled" ? (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await resumeSaasPlan({ data: {} });
              await refresh();
              toast.success(`${name} plan resumed`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not resume the plan.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Resume plan
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setChangeOpen(true)} disabled={plan.status !== "active"}>
            Change to {nextName}
          </Button>
          <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={plan.status !== "active"}>
            Cancel plan
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        title={`Change to ${nextName}?`}
        body={`Switch to ${nextName} at ${nextPrice}. Demo only. Nothing will be charged.`}
        confirmLabel={`Change to ${nextName}`}
        confirmVariant="primary"
        busy={busy}
        busyLabel="Changing…"
        onConfirm={async () => {
          setBusy(true);
          try {
            await changeSaasPlan({ data: { code: nextCode } });
            setChangeOpen(false);
            await refresh();
            toast.success(`Switched to ${nextName}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change the plan.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel plan?"
        body="Demo only. Nothing will be charged."
        confirmLabel="Cancel plan"
        busy={busy}
        busyLabel="Canceling…"
        onConfirm={async () => {
          setBusy(true);
          try {
            await cancelSaasPlan({ data: {} });
            setCancelOpen(false);
            await refresh();
            toast.success("Plan canceled");
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
        <p className="mt-1 font-display text-2xl text-navy">Crew $39/mo · Office $79/mo</p>
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
