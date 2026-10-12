import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  deleteTeamMember,
  listTeam,
  resendTeamInvite,
  setTeamClockIn,
  setTeamMemberClockIn,
  setTeamMessaging,
  updateTeamMember,
} from "@/lib/sweepbook/team";
import { formatPayRate } from "@/lib/sweepbook/team-pay";
import { actorWritesLocked, isOfficeActor, type TeamMember } from "@/lib/sweepbook/types";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EditMember } from "@/components/app/edit-team-member";

export const Route = createFileRoute("/app/team/")({ component: TeamPage });

function TeamPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["team"], queryFn: () => listTeam() });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const isMaster = actor.data?.kind === "cleaner";
  const writesLocked = actorWritesLocked(actor.data);
  const canManageAdmins = Boolean(q.data?.canManageAdmins);
  const canEditPay = Boolean(q.data?.canEditPay);
  const canToggleAccountMessaging = Boolean(q.data?.canToggleAccountMessaging);

  if (actor.data && !isOfficeActor(actor.data)) {
    return <p className="text-muted">Only the office manages the team.</p>;
  }

  const members = q.data?.members ?? [];
  const admins = q.data?.admins ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Team"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/app/team/new">Add Team Member</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/time-off">Time off</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/team-pay">Team pay</Link>
            </Button>
            {isMaster ? (
              <Button variant="outline" asChild>
                <Link to="/app/data" search={{ kind: "team" }}>
                  Download / Import
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <p className="max-w-xl text-sm text-muted">
        Invite cleaners who already work with you. They see only the jobs you assign — never cards, charges, or billing.
      </p>
      {q.data && !q.data.teamPayEnabled ? (
        <p className="max-w-xl text-sm text-muted">
          Team pay tracks what you owe cleaners. It is included in the Office Subscription.
        </p>
      ) : null}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Team messaging</p>
          <p className="text-sm text-muted">
            {q.data?.teamMessagingEnabled
              ? "Team members can message. Turning the account off turns every cleaner off."
              : "Messaging is off for every team cleaner."}
          </p>
        </div>
        {canToggleAccountMessaging ? (
          <Button
            variant={q.data?.teamMessagingEnabled ? "primary" : "outline"}
            disabled={writesLocked}
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
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Team clock in/out</p>
          <p className="text-sm text-muted">
            {q.data?.teamClockInEnabled
              ? "Assigned cleaners can tap On my way, Start, and Finish. Turning the account off turns every cleaner off."
              : "Clock in/out is off for every team cleaner. The office can still set status."}
          </p>
        </div>
        <Button
          variant={q.data?.teamClockInEnabled ? "primary" : "outline"}
          disabled={writesLocked}
          onClick={async () => {
            await setTeamClockIn({ data: !q.data?.teamClockInEnabled });
            toast.message(q.data?.teamClockInEnabled ? "Clock in/out off." : "Clock in/out on.");
            await qc.invalidateQueries({ queryKey: ["team"] });
            await qc.invalidateQueries({ queryKey: ["actor"] });
            await qc.invalidateQueries({ queryKey: ["checklist-office"] });
          }}
        >
          {q.data?.teamClockInEnabled ? "On" : "Off"}
        </Button>
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
                className="relative flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-secondary/50"
              >
                <Link
                  to="/app/team/$userId"
                  params={{ userId: m.user_id }}
                  aria-label={`Open ${m.full_name}`}
                  className="absolute inset-0 z-0 rounded-xl"
                />
                <div className="pointer-events-none relative min-w-0">
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
                  {!canEditPay ? null : (
                    <p className="mt-1 text-xs text-muted">
                      Pay: {formatPayRate(m.pay_type ?? "none", m.pay_amount ?? 0)}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-navy">Open</p>
                  {m.invite_token ? (
                    <p className="mt-1 break-all text-[11px] text-muted">
                      {typeof window !== "undefined" ? `${window.location.origin}/team-invite/${m.invite_token}` : m.invite_token}
                    </p>
                  ) : null}
                </div>
                <div className="pointer-events-auto relative z-10 flex flex-wrap gap-2">
                  {m.pending ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const res = await resendTeamInvite({ data: { inviteToken: m.invite_token } });
                        const url = `${window.location.origin}${res.path}`;
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
                      {m.office_role !== "admin" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await setTeamMemberClockIn({
                              data: { userId: m.user_id, enabled: !m.can_clock_in },
                            });
                            toast.message(m.can_clock_in ? "Clock in/out off." : "Clock in/out on.");
                            await qc.invalidateQueries({ queryKey: ["team"] });
                            await qc.invalidateQueries({ queryKey: ["actor"] });
                          }}
                        >
                          Clock in/out: {m.can_clock_in ? "On" : "Off"}
                        </Button>
                      ) : null}
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                    Edit
                  </Button>
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
            Admins can add, change, and remove clients and cleaners, and they can manage the schedule and assignments. Charge permission stays off unless you turn it on.
          </p>
          <div className="mt-3 grid gap-2">
            {admins.length === 0 ? (
              <EmptyState title="No admins yet" body="Add an office helper and choose Admin as the role." />
            ) : (
              admins.map((m) => (
                <Card
                  key={m.user_id}
                  className="relative flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-secondary/50"
                >
                  <Link
                    to="/app/team/$userId"
                    params={{ userId: m.user_id }}
                    aria-label={`Open ${m.full_name}`}
                    className="absolute inset-0 z-0 rounded-xl"
                  />
                  <div className="pointer-events-none relative min-w-0">
                    <p className="font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted">
                      {m.email || m.phone || "No contact"} ·{" "}
                      {m.pending ? (m.invite_sent ? "Invite pending" : "Saved") : m.team_status}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Can charge clients: {m.can_charge ? "On" : "Off"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-navy">Open</p>
                    {m.invite_token ? (
                      <p className="mt-1 break-all text-[11px] text-muted">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/team-invite/${m.invite_token}`
                          : m.invite_token}
                      </p>
                    ) : null}
                  </div>
                  <div className="pointer-events-auto relative z-10 flex flex-wrap gap-2">
                    {m.pending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const res = await resendTeamInvite({ data: { inviteToken: m.invite_token } });
                          const url = `${window.location.origin}${res.path}`;
                          await navigator.clipboard?.writeText(url).catch(() => undefined);
                          toast.success(m.invite_sent ? "Invite link copied." : "Invite sent. Link copied.");
                          await qc.invalidateQueries({ queryKey: ["team"] });
                        }}
                      >
                        {m.invite_sent ? "Resend invite" : "Send invite"}
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                      Edit
                    </Button>
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
            canEditPay={canEditPay}
            canEditCharge={canManageAdmins && editing.office_role === "admin"}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await qc.invalidateQueries({ queryKey: ["team"] });
              await qc.invalidateQueries({ queryKey: ["crew-marks"] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              await qc.invalidateQueries({ queryKey: ["actor"] });
              await qc.invalidateQueries({ queryKey: ["client"] });
              await qc.invalidateQueries({ queryKey: ["clients"] });
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
