import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { deleteClient, getClient, setClientAssignees, updateClient } from "@/lib/sweepbook/clients";
import { listChecklistTemplates } from "@/lib/sweepbook/checklists";
import { actorCanCharge, actorWritesLocked } from "@/lib/sweepbook/types";
import { createInvite } from "@/lib/sweepbook/invites";
import { adminClientThread, masterClientThread } from "@/lib/sweepbook/threads";
import { chargeCard, createCardLink } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { formatHours, money } from "@/lib/sweepbook/time";
import { ClientFields } from "@/components/app/client-fields";
import { CardManager, CardSelect, StripeCollectNote, defaultSavedCard, useClientChargeMode } from "@/components/app/card-manager";
import { StripeCardSetup } from "@/components/app/stripe-card-setup";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { AssignmentSave, sameIdSet } from "@/components/app/assignment-scope";
import { CollapsedSection } from "@/components/app/team-details";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ManageRecurringDialog } from "@/components/app/manage-recurring";
import { VisitChargeLine } from "@/components/app/receipt";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { OfficeCalendar } from "@/components/app/office-calendar";
import { OpenedContent } from "@/components/app/opened-content";

const STRIPE_SETUP_NOTE =
  "This company cannot charge a card until Stripe setup is finished. To add Stripe for charging clients, go to Billing under the Settings tab. Under “Client Cards” click Connect Stripe.";

export const Route = createFileRoute("/app/clients/$id")({ component: ClientProfile });

function ClientProfile() {
  const { id } = Route.useParams();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["client", id], queryFn: () => getClient({ data: id }) });
  const canCharge = actorCanCharge(actor.data);
  const writesLocked = actorWritesLocked(actor.data);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [cardLink, setCardLink] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (q.error) return <p className="text-danger">{(q.error as Error).message}</p>;
  const { client, invoices, cards, staff } = q.data;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-sage">{client.frequency || "client"}</p>
          <h1 className="font-display text-3xl text-navy">{client.name}</h1>
          <p className="text-sm text-muted">{client.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {writesLocked ? null : (
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit"}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link
              to="/app/messages/$clientId"
              params={{
                clientId:
                  actor.data?.kind === "admin"
                    ? adminClientThread(actor.data.userId, client.id)
                    : masterClientThread(client.id),
              }}
            >
              Message
            </Link>
          </Button>
          {writesLocked ? null : (
            <>
              <Button asChild>
                <Link to="/app/jobs/new" search={{ clientId: client.id }}>
                  Schedule
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setManageOpen(true)}>
                Manage recurring
              </Button>
              <Button variant="ghost" onClick={() => setRemoveOpen(true)}>
                Remove
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-navy">Household</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <Row k="Phone" v={client.phone} />
            <Row k="Email" v={client.email} />
            <Row k="Access" v={client.access_notes} />
            <Row k="Pets" v={client.pets} />
            <Row k="Supplies" v={client.supplies} />
            <Row k="Usual" v={`${client.usual_day || "—"} ${client.usual_time || ""}`.trim()} />
            <Row k="Price" v={client.default_price_cents ? money(client.default_price_cents) : "—"} />
            <Row k="Duration" v={client.default_duration_min ? formatHours(client.default_duration_min) : "—"} />
            <DefaultChecklistRow templateId={client.checklist_template_id} />
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                Notes <span className="font-normal normal-case tracking-normal">(Visible to assigned cleaner(s))</span>
              </dt>
              <dd>{client.notes || "—"}</dd>
            </div>
          </dl>
        </Card>
        {canCharge ? (
        <Card>
          <h2 className="font-display text-lg text-navy">Cards on file</h2>
          <p className="mt-1 text-xs text-muted">Demo keeps brand and last four only. A connected company saves the card in Stripe and charges it here.</p>
          <div className="mt-3">
            <CardManager
              clientId={client.id}
              cards={cards}
              source="cleaner"
              blockedMessage={STRIPE_SETUP_NOTE}
              onChange={async () => {
                await qc.invalidateQueries({ queryKey: ["client", id] });
              }}
            />
          </div>
          <div className="mt-4 grid gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const res = await createCardLink({ data: client.id });
                const url = `${window.location.origin}${res.path}`;
                setCardLink(url);
                await navigator.clipboard?.writeText(url).catch(() => undefined);
                toast.success("Add-card link copied.");
              }}
            >
              Send add-card link
            </Button>
            {cardLink ? (
              <OpenedContent>
                <p className="break-all text-xs text-muted">{cardLink}</p>
              </OpenedContent>
            ) : null}
            {writesLocked ? null : (
            <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
              <DialogTrigger asChild>
                <Button>Charge a card</Button>
              </DialogTrigger>
              <DialogContent title="Confirm charge">
                <ChargeForm
                  defaultAmount={client.default_price_cents ?? 15000}
                  name={client.name}
                  cards={cards}
                  clientId={client.id}
                  onCardSaved={async () => {
                    await qc.invalidateQueries({ queryKey: ["client", id] });
                  }}
                  onConfirm={async (amountCents, description, cardId) => {
                    try {
                      const res = await chargeCard({ data: { clientId: client.id, amountCents, description, cardId } });
                      if (res.ok) {
                        toast.success(`Paid. Receipt ${res.receiptNumber}`);
                        setChargeOpen(false);
                        await qc.invalidateQueries({ queryKey: ["client", id] });
                      } else if ("reason" in res) toast.error(res.reason);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Charge failed.");
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
            )}
          </div>
        </Card>
        ) : (
          <Card>
            <h2 className="font-display text-lg text-navy">Payments</h2>
            <p className="mt-2 text-sm text-muted">
              Paid and unpaid show on visits. Charging cards is off for this admin login.
            </p>
          </Card>
        )}
      </div>

      <Card>
        <AssignedCleaners
          clientId={client.id}
          staff={staff ?? []}
          savedIds={(client.assignees ?? [])
            .map((a) => a.user_id)
            .filter((id) => (staff ?? []).some((person) => person.user_id === id))}
          selectedIds={
            assigneeIds?.filter((id) => (staff ?? []).some((person) => person.user_id === id)) ?? null
          }
          onSelected={setAssigneeIds}
          writesLocked={writesLocked}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["client", id] });
            await qc.invalidateQueries({ queryKey: ["clients"] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
            await qc.invalidateQueries({ queryKey: ["team"] });
            setAssigneeIds(null);
          }}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-navy">Invite to the portal</h2>
          {writesLocked ? null : (
          <Button
            variant="outline"
            onClick={async () => {
              const res = await createInvite({ data: client.id });
              const url = `${window.location.origin}${res.path}`;
              setInviteUrl(url);
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              toast.success("Invite link copied.");
            }}
          >
            Copy invite link
          </Button>
          )}
        </div>
        {inviteUrl ? (
          <OpenedContent>
            <p className="mt-2 break-all text-xs text-muted">{inviteUrl}</p>
          </OpenedContent>
        ) : null}
        <p className="mt-2 text-sm text-muted">
          {client.linked_user_id ? "This household already has a portal login." : "They have not joined yet."}
        </p>
      </Card>

      {editing ? (
        <OpenedContent>
        <ClientFields
          initial={{
            first_name: client.first_name ?? undefined,
            last_name: client.last_name ?? undefined,
            name: client.name,
            phone: client.phone ?? undefined,
            email: client.email ?? undefined,
            sms_opt_in: client.sms_opt_in === true,
            address: client.address ?? undefined,
            address_line1: client.address_line1 ?? undefined,
            address_line2: client.address_line2 ?? undefined,
            city: client.city ?? undefined,
            state: client.state ?? undefined,
            zip: client.zip ?? undefined,
            bedrooms: client.bedrooms,
            bathrooms: client.bathrooms,
            square_footage: client.square_footage,
            access_notes: client.access_notes ?? undefined,
            pets: client.pets ?? undefined,
            supplies: client.supplies ?? undefined,
            default_price_cents: client.default_price_cents,
            default_duration_min: client.default_duration_min,
            usual_day: client.usual_day ?? undefined,
            usual_time: client.usual_time ?? undefined,
            frequency: client.frequency ?? undefined,
            notes: client.notes ?? undefined,
            checklist_template_id: client.checklist_template_id ?? undefined,
          }}
          submitLabel="Save profile"
          onSubmit={async (input) => {
            await updateClient({ data: { ...input, id: client.id } });
            toast.success("Profile saved.");
            setEditing(false);
            await qc.invalidateQueries({ queryKey: ["client", id] });
          }}
        />
        </OpenedContent>
      ) : null}

      <OfficeCalendar
        clientId={client.id}
        variant="embed"
        showTimeOff={false}
        named="service"
        showImport={false}
        viewScope={`client-${client.id}`}
      />
      <section>
        <h2 className="font-display text-xl text-navy">Invoices</h2>
        <div className="mt-3 grid gap-2">
          {invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm">{i.description}</p>
                <p className="tabular text-xs text-muted">{money(i.amount_cents)}</p>
                <VisitChargeLine
                  jobStart={i.job_start_at}
                  status={i.status}
                  paidAt={i.paid_at}
                  method={i.method}
                  note={i.paid_note}
                />
              </div>
              <InvoiceStatusBadge status={i.status} />
            </div>
          ))}
        </div>
      </section>
      <ManageRecurringDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        clientId={client.id}
        onChanged={async () => {
          await qc.invalidateQueries({ queryKey: ["client", id] });
          await qc.invalidateQueries({ queryKey: ["jobs"] });
        }}
      />
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove client?"
        body={`Are you sure you want to remove ${client.name}? This cannot be undone.`}
        busy={removing}
        onConfirm={async () => {
          setRemoving(true);
          try {
            await deleteClient({ data: client.id });
            toast.message("Client removed.");
            setRemoveOpen(false);
            await navigate({ to: "/app/clients" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove.");
          } finally {
            setRemoving(false);
          }
        }}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-muted">{k}</dt>
      <dd>{v || "—"}</dd>
    </div>
  );
}

function DefaultChecklistRow({ templateId }: { templateId?: string | null }) {
  const q = useQuery({ queryKey: ["checklists"], queryFn: () => listChecklistTemplates() });
  const name = q.data?.find((t) => t.id === templateId)?.name || (templateId ? "Custom" : "None");
  return <Row k="Checklist" v={name} />;
}

function ChargeForm({
  defaultAmount,
  name,
  cards,
  clientId,
  onCardSaved,
  onConfirm,
}: {
  defaultAmount: number;
  name: string;
  cards: { id: string; brand: string; last4: string; is_default: boolean }[];
  clientId: string;
  onCardSaved: () => Promise<void>;
  onConfirm: (amount: number, description: string, cardId?: string) => void;
}) {
  const [amt, setAmt] = useState((defaultAmount / 100).toFixed(2));
  const [desc, setDesc] = useState(`House cleaning — ${name}`);
  const [cardId, setCardId] = useState("");
  const mode = useClientChargeMode();
  const local = mode.data?.mode === "demo";
  const saved = defaultSavedCard(cards);
  const cents = Math.round(Number(amt) * 100);
  if (mode.data?.mode === "blocked") {
    return <p className="text-sm text-muted">{STRIPE_SETUP_NOTE}</p>;
  }
  if (mode.data?.mode === "stripe" && !saved) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted">No card on file. Add one here, or send an add-card link. Charge stays in CrewWeek after the card is saved.</p>
        <StripeCardSetup
          clientId={clientId}
          source="cleaner"
          onSaved={async (saved) => {
            toast.success(`Saved ${brandLabel(saved.brand)} · ${saved.last4}`);
            await onCardSaved();
          }}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        If charging for specific cleaning appointment, for accounting, charge card in the calendar tab by clicking on the specific appointment you want to charge for. Click Charge in the window for that appointment.
      </p>
      <Field label="Amount">
        <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      {local ? <CardSelect cards={cards} value={cardId} onChange={setCardId} /> : <StripeCollectNote card={saved} />}
      <Button onClick={() => onConfirm(cents, desc, local ? cardId || undefined : saved?.id)}>
        {`Charge ${money(cents)}`}
      </Button>
    </div>
  );
}

function AssignedCleaners({
  clientId,
  staff,
  savedIds,
  selectedIds,
  onSelected,
  writesLocked,
  onSaved,
}: {
  clientId: string;
  staff: { user_id: string; full_name: string }[];
  savedIds: string[];
  selectedIds: string[] | null;
  onSelected: (ids: string[]) => void;
  writesLocked: boolean;
  onSaved: () => Promise<void>;
}) {
  const selected = selectedIds ?? savedIds;
  const summary =
    staff
      .filter((person) => selected.includes(person.user_id))
      .map((person) => person.full_name)
      .join(", ") || "None";
  return (
    <CollapsedSection title="Assigned cleaners" summary={summary}>
      <p className="text-sm text-muted">
        Visits for this household show on each assigned person’s schedule. Saving here updates their team page.
      </p>
      <AssigneePicker staff={staff} selected={selected} onChange={onSelected} />
      {writesLocked ? null : (
        <AssignmentSave
          unchanged={sameIdSet(selected, savedIds)}
          previewClientIds={selected.length ? [clientId] : []}
          previewUserIds={selected}
          onSave={async (when) => {
            await setClientAssignees({ data: { clientId, userIds: selected, when } });
            toast.success("Assigned cleaners saved.");
            await onSaved();
          }}
        />
      )}
    </CollapsedSection>
  );
}
