import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  createTeamInvite,
  deleteTeamMember,
  listTeam,
  resendTeamInvite,
  saveTeamMember,
  setTeamMessaging,
  updateTeamMember,
} from "@/lib/sweepbook/team";
import { formatPayRate, type PayType } from "@/lib/sweepbook/team-pay";
import { isOfficeActor, type OfficeRole, type TeamMember } from "@/lib/sweepbook/types";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NameFields } from "@/components/app/name-fields";
import { PhoneInput } from "@/components/app/phone-input";
import { namesFrom } from "@/lib/sweepbook/people";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/app/team/")({ component: TeamPage });

function TeamPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["team"], queryFn: () => listTeam() });
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [canMessage, setCanMessage] = useState(true);
  const [inviteKind, setInviteKind] = useState<OfficeRole>("team");
  const [canCharge, setCanCharge] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const isMaster = actor.data?.kind === "cleaner";
  const canManageAdmins = Boolean(q.data?.canManageAdmins);
  const canEditPay = Boolean(q.data?.canEditPay);
  const canToggleAccountMessaging = Boolean(q.data?.canToggleAccountMessaging);

  if (actor.data && !isOfficeActor(actor.data)) {
    return <p className="text-muted">Only the office manages the team.</p>;
  }

  const members = q.data?.members ?? [];
  const admins = q.data?.admins ?? [];
  const clients = q.data?.clients ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Team"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/time-off">Time off</Link>
            </Button>
            {isMaster ? (
              <>
                <Button variant="outline" asChild>
                  <Link to="/app/team-pay">Team pay</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/app/data" search={{ kind: "team" }}>
                    Download / Import
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />
      <p className="max-w-xl text-sm text-muted">
        Invite cleaners who already work with you. They see only the jobs you assign — never cards, charges, or billing.
      </p>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Team messaging</p>
          <p className="text-sm text-muted">
            {q.data?.teamMessagingEnabled
              ? "Team members can message. You can turn off individual cleaners below."
              : "Messaging for all team members is off."}
          </p>
        </div>
        {canToggleAccountMessaging ? (
          <Button
            variant={q.data?.teamMessagingEnabled ? "primary" : "outline"}
            onClick={async () => {
              await setTeamMessaging({ data: !q.data?.teamMessagingEnabled });
              await qc.invalidateQueries({ queryKey: ["team"] });
              await qc.invalidateQueries({ queryKey: ["actor"] });
              await qc.invalidateQueries({ queryKey: ["threads"] });
              await qc.invalidateQueries({ queryKey: ["message-recipients"] });
            }}
          >
            {q.data?.teamMessagingEnabled ? "On" : "Off"}
          </Button>
        ) : (
          <p className="text-sm text-muted">{q.data?.teamMessagingEnabled ? "On" : "Off"}</p>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg text-navy">Add a person</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const res = await createTeamInvite({
                data: { firstName, lastName, phone, email, canMessage, inviteKind, canCharge },
              });
              const url = `${window.location.origin}${res.path}`;
              setInviteUrl(url);
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              toast.success("Invite link copied.");
              setFirstName("");
              setLastName("");
              setPhone("");
              setEmail("");
              setCanCharge(false);
              setInviteKind("team");
              await qc.invalidateQueries({ queryKey: ["team"] });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not create invite.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {canManageAdmins ? (
            <Field label="Role">
              <NativeSelect
                value={inviteKind}
                onChange={(e) => setInviteKind(e.target.value === "admin" ? "admin" : "team")}
              >
                <option value="team">Team cleaner</option>
                <option value="admin">Admin</option>
              </NativeSelect>
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
          </div>
          <Field label="Phone">
            <PhoneInput value={phone} onChange={setPhone} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {inviteKind === "team" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canMessage} onChange={(e) => setCanMessage(e.target.checked)} />
              Can message clients
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={canCharge} onChange={(e) => setCanCharge(e.target.checked)} />
              Can charge clients
            </label>
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (!firstName.trim() || !lastName.trim()) {
                  toast.error("First and last name are required.");
                  return;
                }
                setBusy(true);
                try {
                  await saveTeamMember({ data: { firstName, lastName, phone, email, canMessage, inviteKind, canCharge } });
                  toast.success("Saved to the team list.");
                  setFirstName("");
                  setLastName("");
                  setPhone("");
                  setEmail("");
                  await qc.invalidateQueries({ queryKey: ["team"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
        {inviteUrl ? <p className="mt-2 break-all text-xs text-muted">{inviteUrl}</p> : null}
      </Card>

      <section>
        <h2 className="font-display text-xl text-navy">Cleaners</h2>
        <div className="mt-3 grid gap-2">
          {members.length === 0 ? (
            <EmptyState title="No team yet" body="Add someone you already work with. They get their own login from the invite link." />
          ) : (
            members.map((m) => (
              <Card
                key={m.user_id}
                className={`relative flex flex-wrap items-center justify-between gap-3 p-4 ${
                  m.pending ? "" : "transition-colors hover:bg-secondary/50"
                }`}
              >
                {m.pending ? null : (
                  <Link
                    to="/app/team/$userId"
                    params={{ userId: m.user_id }}
                    aria-label={`Open ${m.full_name}'s schedule`}
                    className="absolute inset-0 z-0 rounded-xl"
                  />
                )}
                <div className="relative z-10 min-w-0">
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted">
                    {m.email || m.phone || "No contact"} ·{" "}
                    {m.pending ? (m.invite_sent ? "Invite pending" : "Saved") : m.team_status}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {m.assigned_clients.length
                      ? `Clients: ${m.assigned_clients.map((c) => c.name).join(", ")}`
                      : "No clients assigned"}
                  </p>
                  {m.pending || !canEditPay ? null : (
                    <p className="mt-1 text-xs text-muted">
                      Pay: {formatPayRate(m.pay_type ?? "none", m.pay_amount ?? 0)}
                    </p>
                  )}
                  {m.pending ? null : (
                    <p className="mt-1 text-xs font-medium text-navy">View schedule</p>
                  )}
                  {m.invite_token ? (
                    <p className="mt-1 break-all text-[11px] text-muted">
                      {typeof window !== "undefined" ? `${window.location.origin}/team-invite/${m.invite_token}` : m.invite_token}
                    </p>
                  ) : null}
                </div>
                <div className="relative z-10 flex flex-wrap gap-2">
                  {m.pending ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const res = await resendTeamInvite({ data: { inviteToken: m.invite_token } });
                        const url = `${window.location.origin}${res.path}`;
                        setInviteUrl(url);
                        await navigator.clipboard?.writeText(url).catch(() => undefined);
                        toast.success(m.invite_sent ? "Invite link copied." : "Invite sent. Link copied.");
                        await qc.invalidateQueries({ queryKey: ["team"] });
                      }}
                    >
                      {m.invite_sent ? "Resend invite" : "Send invite"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateTeamMember({ data: { userId: m.user_id, canMessage: !m.can_message } });
                          toast.message(m.can_message ? "Messaging off." : "Messaging on.");
                          await qc.invalidateQueries({ queryKey: ["team"] });
                          await qc.invalidateQueries({ queryKey: ["actor"] });
                          await qc.invalidateQueries({ queryKey: ["threads"] });
                          await qc.invalidateQueries({ queryKey: ["message-recipients"] });
                        }}
                      >
                        Messaging: {m.can_message ? "On" : "Off"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                        Edit
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(m)}>
                    Remove
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {canManageAdmins ? (
        <section>
          <h2 className="font-display text-xl text-navy">Admins</h2>
          <p className="mt-1 text-sm text-muted">
            Office helpers can book clients and the calendar. Charge permission is off unless you turn it on.
          </p>
          <div className="mt-3 grid gap-2">
            {admins.length === 0 ? (
              <EmptyState title="No admins yet" body="Add an office helper above and choose Admin as the role." />
            ) : (
              admins.map((m) => (
                <Card key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted">
                      {m.email || m.phone || "No contact"} ·{" "}
                      {m.pending ? (m.invite_sent ? "Invite pending" : "Saved") : m.team_status}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Can charge clients: {m.can_charge ? "On" : "Off"}
                    </p>
                    {m.invite_token ? (
                      <p className="mt-1 break-all text-[11px] text-muted">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/team-invite/${m.invite_token}`
                          : m.invite_token}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.pending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const res = await resendTeamInvite({ data: { inviteToken: m.invite_token } });
                          const url = `${window.location.origin}${res.path}`;
                          setInviteUrl(url);
                          await navigator.clipboard?.writeText(url).catch(() => undefined);
                          toast.success(m.invite_sent ? "Invite link copied." : "Invite sent. Link copied.");
                          await qc.invalidateQueries({ queryKey: ["team"] });
                        }}
                      >
                        {m.invite_sent ? "Resend invite" : "Send invite"}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                        Edit
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(m)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? (
          <EditMember
            member={editing}
            clients={clients}
            canEditPay={canEditPay}
            canEditCharge={canManageAdmins && editing.office_role === "admin"}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await qc.invalidateQueries({ queryKey: ["team"] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              await qc.invalidateQueries({ queryKey: ["actor"] });
            }}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={removeTarget?.office_role === "admin" ? "Remove admin?" : "Remove team cleaner?"}
        body={`Are you sure you want to remove ${removeTarget?.full_name ?? "this person"}? This cannot be undone.`}
        busy={removing}
        onConfirm={async () => {
          if (!removeTarget) return;
          setRemoving(true);
          try {
            await deleteTeamMember({ data: { userId: removeTarget.user_id, pending: removeTarget.pending } });
            toast.message("Removed.");
            setRemoveTarget(null);
            await qc.invalidateQueries({ queryKey: ["team"] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
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

function EditMember({
  member,
  clients,
  canEditPay,
  canEditCharge,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  clients: { id: string; name: string }[];
  canEditPay: boolean;
  canEditCharge: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isAdminMember = member.office_role === "admin";
  const names = namesFrom(member.first_name, member.last_name, member.full_name);
  const [firstName, setFirstName] = useState(names.first_name);
  const [lastName, setLastName] = useState(names.last_name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [active, setActive] = useState(member.team_status !== "disabled");
  const [messaging, setMessaging] = useState(member.can_message);
  const [charge, setCharge] = useState(Boolean(member.can_charge));
  const [assigned, setAssigned] = useState(member.assigned_clients.map((c) => c.id));
  const [payType, setPayType] = useState<PayType>(member.pay_type ?? "none");
  const [payDollars, setPayDollars] = useState(((member.pay_amount ?? 0) / 100).toFixed(2));
  const [payPercent, setPayPercent] = useState(String(member.pay_type === "percent" ? member.pay_amount ?? 0 : 0));
  const [payNote, setPayNote] = useState(member.pay_note ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <DialogContent title={`Edit ${member.full_name}`} className="max-h-[90dvh] overflow-y-auto">
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await updateTeamMember({
              data: {
                userId: member.user_id,
                firstName,
                lastName,
                phone,
                email,
                canMessage: isAdminMember ? undefined : messaging,
                status: active ? "active" : "disabled",
                assignedClientIds: isAdminMember ? undefined : assigned,
                canCharge: canEditCharge ? charge : undefined,
                ...(canEditPay && !isAdminMember
                  ? {
                      payType,
                      payAmount:
                        payType === "none"
                          ? 0
                          : payType === "percent"
                            ? Math.round(Number(payPercent) || 0)
                            : Math.round(Number(payDollars) * 100),
                      payNote,
                    }
                  : {}),
              },
            });
            toast.success(isAdminMember ? "Admin updated." : "Team cleaner updated.");
            await onSaved();
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        {canEditCharge ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
            Can charge clients
          </label>
        ) : null}
        {isAdminMember ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setMessaging((v) => !v)}
          >
            Messaging: {messaging ? "On" : "Off"}
          </Button>
        )}
        {member.pending || !canEditPay || isAdminMember ? null : (
          <div className="grid gap-3 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Pay rate</p>
            <p className="text-xs text-muted">Used on Team pay. This cleaner never sees the rate.</p>
            <Field label="Pay type">
              <NativeSelect value={payType} onChange={(e) => setPayType(e.target.value as PayType)}>
                <option value="none">None</option>
                <option value="hourly">Hourly</option>
                <option value="per_job">Per job</option>
                <option value="percent">Percent of job price</option>
              </NativeSelect>
            </Field>
            {payType === "hourly" || payType === "per_job" ? (
              <Field label={payType === "hourly" ? "Hourly rate" : "Per-job rate"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payDollars}
                  onChange={(e) => setPayDollars(e.target.value)}
                />
              </Field>
            ) : null}
            {payType === "percent" ? (
              <Field label="Percent of job price">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={payPercent}
                  onChange={(e) => setPayPercent(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Note (optional)">
              <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </Field>
          </div>
        )}
        {isAdminMember ? null : (
        <div>
          <p className="text-sm font-medium">Assigned clients</p>
          <p className="text-xs text-muted">Their recurring jobs appear on this cleaner’s schedule.</p>
          <div className="mt-2 grid gap-1">
            {clients.map((c) => {
              const on = assigned.includes(c.id);
              return (
                <label key={c.id} className="flex min-h-11 items-center gap-2 rounded-md px-2 hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setAssigned(on ? assigned.filter((id) => id !== c.id) : [...assigned, c.id])}
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const res = await resendTeamInvite({ data: { userId: member.user_id, inviteToken: member.invite_token } });
            const url = `${window.location.origin}${res.path}`;
            await navigator.clipboard?.writeText(url).catch(() => undefined);
            toast.success("Invite link copied.");
          }}
        >
          Resend invite
        </Button>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
