import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { listJobs } from "@/lib/sweepbook/jobs";
import { deleteTeamMember, listTeam, resendTeamInvite, setCleanerClients } from "@/lib/sweepbook/team";
import { actorWritesLocked } from "@/lib/sweepbook/types";
import { listCrewMarks } from "@/lib/sweepbook/crew-details";
import { crewMarksForDay } from "@/lib/sweepbook/availability";
import { addDaysChicago, startOfChicagoDay } from "@/lib/sweepbook/time";
import { addressPartsFrom, formatAddress, formatPhoneAsTyped } from "@/lib/sweepbook/people";
import { JobPanel } from "@/components/app/job-panel";
import { EditMember } from "@/components/app/edit-team-member";
import { AssigneePicker } from "@/components/app/assignee-picker";
import { AssignmentSave, sameIdSet } from "@/components/app/assignment-scope";
import { CollapsedSection, TeamDetailView } from "@/components/app/team-details";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/empty-state";
import {
  CalendarBody,
  CalendarNav,
  calendarDays,
  calendarRange,
  calendarTitle,
  isoDay,
  parseAnchor,
  readCalView,
  writeCalView,
  type CalView,
  type CrewDayMark,
} from "@/components/app/calendar-board";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Search = { view?: CalView; date?: string; job?: string };

function restoreScroll(top: number) {
  const apply = () => {
    if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, left: 0, behavior: "auto" });
  };
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

export const Route = createFileRoute("/app/team/$userId")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: s.view === "day" || s.view === "month" || s.view === "week" ? s.view : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  component: TeamMemberSchedulePage,
});

function TeamMemberSchedulePage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const team = useQuery({
    queryKey: ["team"],
    queryFn: () => listTeam(),
    enabled: actor.data?.kind === "cleaner" || actor.data?.kind === "admin",
  });
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mode, setMode] = useState<CalView>(search.view ?? "month");
  const [anchor, setAnchor] = useState(() => parseAnchor(search.date));
  const [selectedId, setSelectedId] = useState<string | null>(search.job ?? null);
  const [clientIds, setClientIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (search.job) setSelectedId(search.job);
  }, [search.job]);

  useEffect(() => {
    setClientIds(null);
  }, [userId]);

  useEffect(() => {
    if (search.view) {
      setMode(search.view);
      writeCalView(search.view, "team-cal");
      return;
    }
    const stored = readCalView("team-cal");
    if (stored) setMode(stored);
  }, [search.view]);

  const range = useMemo(() => calendarRange(mode, anchor), [anchor, mode]);
  const days = useMemo(() => calendarDays(mode, anchor, range.from), [anchor, mode, range.from]);
  const crewDates = useQuery({
    queryKey: ["crew-marks"],
    queryFn: () => listCrewMarks(),
    enabled: actor.data?.kind === "cleaner" || actor.data?.kind === "admin",
  });

  const jobs = useQuery({
    queryKey: ["jobs", "member", userId, range.from.toISOString(), range.to.toISOString()],
    queryFn: () =>
      listJobs({
        data: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          assignedToUserId: userId,
        },
      }),
    enabled: actor.data?.kind === "cleaner" || actor.data?.kind === "admin",
    refetchOnMount: "always",
  });

  const member = [...(team.data?.members ?? []), ...(team.data?.admins ?? [])].find((m) => m.user_id === userId);
  const marksByDay = useMemo(() => {
    const map = new Map<string, CrewDayMark[]>();
    const mine = (crewDates.data ?? []).filter((person) => person.userId === userId);
    for (const day of days) {
      const marks = crewMarksForDay(mine, isoDay(day));
      if (marks.length) map.set(isoDay(day), marks);
    }
    return map;
  }, [crewDates.data, days, userId]);

  function setView(next: CalView, day?: Date) {
    const d = day ?? anchor;
    setMode(next);
    writeCalView(next, "team-cal");
    setAnchor(startOfChicagoDay(d));
    void navigate({
      to: "/app/team/$userId",
      params: { userId },
      search: { view: next, date: isoDay(d) },
      replace: true,
    });
  }

  function shift(dir: number) {
    const delta = mode === "month" ? dir * 28 : mode === "week" ? dir * 7 : dir;
    const next = addDaysChicago(anchor, delta);
    const top = window.scrollY;
    setAnchor(next);
    void navigate({
      to: "/app/team/$userId",
      params: { userId },
      search: { view: mode, date: isoDay(next) },
      replace: true,
      resetScroll: false,
    });
    restoreScroll(top);
  }

  const back = (
    <Button variant="outline" asChild>
      <Link to="/app/team">Back to Team</Link>
    </Button>
  );

  const isOffice = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  const canCharge = actor.data?.kind === "cleaner" || (actor.data?.kind === "admin" && actor.data.canCharge);
  if (actor.data && !isOffice) {
    return <p className="text-muted">Only the office can open a cleaner’s schedule.</p>;
  }

  if (team.isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  }

  if (!member) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Schedule" action={back} />
        <p className="text-sm text-muted">That person is not on your team.</p>
      </div>
    );
  }

  const person = member;
  const isAdminPerson = person.office_role === "admin";
  const title = calendarTitle(mode, anchor, range.from);
  const statusLine = person.pending ? (person.invite_sent ? "Invite pending" : "Saved") : person.team_status;
  const inviteLabel = person.pending && !person.invite_sent ? "Send invite" : "Resend invite";
  const savedClientIds = person.assigned_clients.map((c) => c.id);
  const selectedClients = clientIds ?? savedClientIds;
  const addedClients = selectedClients.filter((id) => !savedClientIds.includes(id));
  const clientChoices = (team.data?.clients ?? []).map((c) => ({ user_id: c.id, full_name: c.name }));
  const assignmentSummary =
    clientChoices
      .filter((c) => selectedClients.includes(c.user_id))
      .map((c) => c.full_name)
      .join(", ") || "None";
  const writesLocked = actorWritesLocked(actor.data);

  async function sendInvite() {
    const res = await resendTeamInvite({
      data: person.pending ? { inviteToken: person.invite_token } : { userId: person.user_id },
    });
    const url = `${window.location.origin}${res.path}`;
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    toast.success(person.pending && !person.invite_sent ? "Invite sent. Link copied." : "Invite link copied.");
    await qc.invalidateQueries({ queryKey: ["team"] });
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title={person.full_name}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="outline" onClick={() => void sendInvite().catch((err) => toast.error(err instanceof Error ? err.message : "Could not send invite."))}>
              {inviteLabel}
            </Button>
            <Button variant="ghost" onClick={() => setRemoveOpen(true)}>
              Remove
            </Button>
            {back}
          </div>
        }
      />
      <div className="grid gap-1 text-sm text-ink">
        <p>{formatPhoneAsTyped(person.phone) || "No phone"}</p>
        <p>{person.email?.trim() || "No email"}</p>
        <p>{formatAddress(addressPartsFrom(person)) || "No address"}</p>
      </div>
      <p className="max-w-xl text-sm text-muted">
        {statusLine}.
        {isAdminPerson
          ? ""
          : " Assigned visits stay on this calendar. Birthday and work anniversary are markers, not appointments."}
      </p>
      <TeamDetailView
        member={person}
        showPay={!isAdminPerson && actor.data?.userId !== person.user_id}
      />
      {isAdminPerson ? null : (
      <CollapsedSection title="Assigned clients" summary={assignmentSummary}>
        <p className="text-xs text-muted">Saving here updates this person on each client page.</p>
        <AssigneePicker
          staff={clientChoices}
          selected={selectedClients}
          onChange={setClientIds}
          emptyLabel="No clients yet."
        />
        {writesLocked ? null : (
          <AssignmentSave
            unchanged={sameIdSet(selectedClients, savedClientIds)}
            previewClientIds={addedClients}
            previewUserIds={addedClients.length ? [person.user_id] : []}
            onSave={async (when) => {
              await setCleanerClients({ data: { userId: person.user_id, clientIds: selectedClients, when } });
              toast.success("Assigned clients saved.");
              await qc.invalidateQueries({ queryKey: ["team"] });
              await qc.invalidateQueries({ queryKey: ["client"] });
              await qc.invalidateQueries({ queryKey: ["clients"] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              setClientIds(null);
            }}
          />
        )}
      </CollapsedSection>
      )}
      {isAdminPerson ? null : (
      <>
      <CalendarNav
        mode={mode}
        title={title}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onView={(v) => setView(v)}
        onToday={() => {
          const t = startOfChicagoDay(new Date());
          setAnchor(t);
          void navigate({
            to: "/app/team/$userId",
            params: { userId },
            search: { view: mode, date: isoDay(t) },
            replace: true,
          });
        }}
      />
      <CalendarBody
        mode={mode}
        days={days}
        jobs={jobs.data ?? []}
        showPay
        showPrices
        showOverlap
        overlapForUserId={userId}
        named="client"
        canAdd={false}
        onEmpty={() => undefined}
        onOpenDay={(day) => setView("day", day)}
        onJob={(j) => setSelectedId(j.id)}
        marksByDay={marksByDay}
      />
      </>
      )}

      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selectedId ? (
          <JobPanel
            id={selectedId}
            canEdit
            canCharge={Boolean(canCharge)}
            isTeam={false}
            canMessage
            actorKind={actor.data?.kind}
            actorUserId={actor.data?.userId}
            onClose={() => setSelectedId(null)}
            onChanged={async () => {
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              await qc.invalidateQueries({ queryKey: ["job", selectedId] });
              await qc.invalidateQueries({ queryKey: ["invoices"] });
              await qc.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        {editing ? (
          <EditMember
            member={person}
            canEditPay={Boolean(team.data?.canEditPay)}
            canEditCharge={Boolean(team.data?.canManageAdmins) && person.office_role === "admin"}
            onClose={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false);
              await qc.invalidateQueries({ queryKey: ["team"] });
              await qc.invalidateQueries({ queryKey: ["team-pay"] });
              await qc.invalidateQueries({ queryKey: ["crew-marks"] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
              await qc.invalidateQueries({ queryKey: ["assignable-staff"] });
              await qc.invalidateQueries({ queryKey: ["staff"] });
            }}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={person.office_role === "admin" ? "Remove admin?" : "Remove team cleaner?"}
        body={`Are you sure you want to remove ${person.full_name}? This cannot be undone.`}
        busy={removing}
        onConfirm={async () => {
          setRemoving(true);
          try {
            await deleteTeamMember({ data: { userId: person.user_id, pending: person.pending } });
            toast.message("Removed.");
            setRemoveOpen(false);
            await navigate({ to: "/app/team" });
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
