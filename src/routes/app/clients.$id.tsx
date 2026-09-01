import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { deleteClient, getClient, setClientAssignees, updateClient } from "@/lib/sweepbook/clients";
import { createInvite } from "@/lib/sweepbook/invites";
import { masterClientThread } from "@/lib/sweepbook/threads";
import { addCardAuthenticated, chargeCard, createCardLink, recordOutsidePayment } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { formatDateTime, formatHours, money } from "@/lib/sweepbook/time";
import { ClientFields } from "@/components/app/client-fields";
import { CardForm } from "@/components/app/card-form";
import { CardManager, CardSelect } from "@/components/app/card-manager";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { InvoiceStatusBadge, VisitStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";

export const Route = createFileRoute("/app/clients/$id")({ component: ClientProfile });

function ClientProfile() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["client", id], queryFn: () => getClient({ data: id }) });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [cardLink, setCardLink] = useState<string | null>(null);
  const [collectCard, setCollectCard] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [outsideOpen, setOutsideOpen] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[] | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (q.error) return <p className="text-danger">{(q.error as Error).message}</p>;
  const { client, jobs, invoices, cards, staff } = q.data;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-sage">{client.frequency || "client"}</p>
          <h1 className="font-display text-3xl text-navy">{client.name}</h1>
          <p className="text-sm text-muted">{client.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/app/messages/$clientId" params={{ clientId: masterClientThread(client.id) }}>
              Message
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app/jobs/new">Schedule</Link>
          </Button>
          <Button variant="ghost" onClick={() => setRemoveOpen(true)}>
            Remove
          </Button>
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
            <Row k="Notes" v={client.notes} />
          </dl>
        </Card>
        <Card>
          <h2 className="font-display text-lg text-navy">Cards on file</h2>
          <p className="mt-1 text-xs text-muted">Brand and last four only. Default is used for charges and tips.</p>
          <div className="mt-3">
            <CardManager
              clientId={client.id}
              cards={cards}
              source="cleaner"
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
            {cardLink ? <p className="break-all text-xs text-muted">{cardLink}</p> : null}
            <Button variant="outline" onClick={() => setCollectCard((v) => !v)}>
              Collect card on site
            </Button>
            {collectCard ? (
              <CardForm
                submitLabel="Save as backup card"
                onSubmit={async (payload) => {
                  const saved = await addCardAuthenticated({
                    data: { ...payload, clientId: client.id, source: "cleaner" },
                  });
                  toast.success(`Saved ${brandLabel(saved.brand)} · ${saved.last4}`);
                  setCollectCard(false);
                  await qc.invalidateQueries({ queryKey: ["client", id] });
                }}
              />
            ) : null}
            <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
              <DialogTrigger asChild>
                <Button>Charge a card</Button>
              </DialogTrigger>
              <DialogContent title="Confirm charge">
                <ChargeForm
                  defaultAmount={client.default_price_cents ?? 15000}
                  name={client.name}
                  cards={cards}
                  onConfirm={async (amountCents, description, cardId) => {
                    const res = await chargeCard({ data: { clientId: client.id, amountCents, description, cardId } });
                    if (res.ok) {
                      toast.success(`Paid. Receipt ${res.receiptNumber}`);
                      setChargeOpen(false);
                      await qc.invalidateQueries({ queryKey: ["client", id] });
                    } else toast.error(res.reason);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={outsideOpen} onOpenChange={setOutsideOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost">Record cash or Venmo</Button>
              </DialogTrigger>
              <DialogContent title="Paid outside SweepBook">
                <OutsideForm
                  clientId={client.id}
                  amount={client.default_price_cents ?? 15000}
                  onDone={async () => {
                    setOutsideOpen(false);
                    await qc.invalidateQueries({ queryKey: ["client", id] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-lg text-navy">Assigned cleaners</h2>
        <p className="mt-1 text-sm text-muted">
          Recurring visits for this household show on each assigned team member’s schedule.
        </p>
        <div className="mt-3">
          <AssigneePicker
            staff={staff ?? []}
            selected={assigneeIds ?? (client.assignees ?? []).map((a) => a.user_id)}
            onChange={setAssigneeIds}
          />
        </div>
        <Button
          className="mt-3"
          variant="outline"
          onClick={async () => {
            const ids = assigneeIds ?? (client.assignees ?? []).map((a) => a.user_id);
            await setClientAssignees({ data: { clientId: client.id, userIds: ids } });
            toast.success("Assigned cleaners saved.");
            await qc.invalidateQueries({ queryKey: ["client", id] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
            await qc.invalidateQueries({ queryKey: ["team"] });
          }}
        >
          Save
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-navy">Invite to the portal</h2>
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
        </div>
        {inviteUrl ? <p className="mt-2 break-all text-xs text-muted">{inviteUrl}</p> : null}
        <p className="mt-2 text-sm text-muted">
          {client.linked_user_id ? "This household already has a portal login." : "They have not joined yet."}
        </p>
      </Card>

      {editing ? (
        <ClientFields
          initial={{
            name: client.name,
            phone: client.phone ?? undefined,
            email: client.email ?? undefined,
            address: client.address ?? undefined,
            access_notes: client.access_notes ?? undefined,
            pets: client.pets ?? undefined,
            supplies: client.supplies ?? undefined,
            default_price_cents: client.default_price_cents,
            default_duration_min: client.default_duration_min,
            usual_day: client.usual_day ?? undefined,
            usual_time: client.usual_time ?? undefined,
            frequency: client.frequency ?? undefined,
            notes: client.notes ?? undefined,
          }}
          submitLabel="Save profile"
          onSubmit={async (input) => {
            await updateClient({ data: { ...input, id: client.id } });
            toast.success("Profile saved.");
            setEditing(false);
            await qc.invalidateQueries({ queryKey: ["client", id] });
          }}
        />
      ) : null}

      <section>
        <h2 className="font-display text-xl text-navy">Job history</h2>
        <div className="mt-3 grid gap-2">
          {jobs.map((j) => (
            <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm font-medium">{formatDateTime(j.start_at)}</p>
                <p className="text-xs text-muted">{money(j.price_cents)}</p>
              </div>
              <VisitStatusBadge job={{ status: j.status, payment_status: null }} />
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl text-navy">Invoices</h2>
        <div className="mt-3 grid gap-2">
          {invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm">{i.description}</p>
                <p className="tabular text-xs text-muted">{money(i.amount_cents)}</p>
              </div>
              <InvoiceStatusBadge status={i.status} />
            </div>
          ))}
        </div>
      </section>
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

function ChargeForm({
  defaultAmount,
  name,
  cards,
  onConfirm,
}: {
  defaultAmount: number;
  name: string;
  cards: { id: string; brand: string; last4: string; is_default: boolean }[];
  onConfirm: (amount: number, description: string, cardId?: string) => void;
}) {
  const [amt, setAmt] = useState((defaultAmount / 100).toFixed(2));
  const [desc, setDesc] = useState(`House cleaning — ${name}`);
  const [cardId, setCardId] = useState("");
  return (
    <div className="grid gap-3">
      <Field label="Amount">
        <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <CardSelect cards={cards} value={cardId} onChange={setCardId} />
      <Button onClick={() => onConfirm(Math.round(Number(amt) * 100), desc, cardId || undefined)}>
        Charge {money(Math.round(Number(amt) * 100))}
      </Button>
    </div>
  );
}

function OutsideForm({
  clientId,
  amount,
  onDone,
}: {
  clientId: string;
  amount: number;
  onDone: () => void;
}) {
  const [amt, setAmt] = useState((amount / 100).toFixed(2));
  const [method, setMethod] = useState<"cash" | "venmo" | "outside">("venmo");
  const [desc, setDesc] = useState("House cleaning (paid outside SweepBook)");
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await recordOutsidePayment({
          data: { clientId, amountCents: Math.round(Number(amt) * 100), description: desc, method },
        });
        toast.success(`Recorded. Receipt ${res.receiptNumber}`);
        onDone();
      }}
    >
      <Field label="Method">
        <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="venmo">Venmo</option>
          <option value="cash">Cash</option>
          <option value="outside">Other</option>
        </NativeSelect>
      </Field>
      <Field label="Amount">
        <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Button type="submit">Save as paid</Button>
    </form>
  );
}
