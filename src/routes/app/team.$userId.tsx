import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { listJobs } from "@/lib/sweepbook/jobs";
import { listTeam } from "@/lib/sweepbook/team";
import { addDaysChicago, startOfChicagoDay } from "@/lib/sweepbook/time";
import { JobPanel } from "@/components/app/job-panel";
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
} from "@/components/app/calendar-board";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Search = { view?: CalView; date?: string; job?: string };

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
    enabled: actor.data?.kind === "cleaner",
  });
  const qc = useQueryClient();
  const [mode, setMode] = useState<CalView>(search.view ?? "month");
  const [anchor, setAnchor] = useState(() => parseAnchor(search.date));
  const [selectedId, setSelectedId] = useState<string | null>(search.job ?? null);

  useEffect(() => {
    if (search.job) setSelectedId(search.job);
  }, [search.job]);

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
    enabled: actor.data?.kind === "cleaner",
    refetchOnMount: "always",
  });

  const member = (team.data?.members ?? []).find((m) => m.user_id === userId && !m.pending);

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
    setAnchor(next);
    void navigate({
      to: "/app/team/$userId",
      params: { userId },
      search: { view: mode, date: isoDay(next) },
      replace: true,
    });
  }

  const back = (
    <Button variant="outline" asChild>
      <Link to="/app/team">Back to Team</Link>
    </Button>
  );

  if (actor.data && actor.data.kind !== "cleaner") {
    return <p className="text-muted">Only the account owner can open a cleaner’s schedule.</p>;
  }

  if (team.isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  }

  if (!member) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Schedule" action={back} />
        <p className="text-sm text-muted">That cleaner is not on your team.</p>
      </div>
    );
  }

  const title = calendarTitle(mode, anchor, range.from);

  return (
    <div className="grid gap-5">
      <PageHeader title={`${member.full_name}’s schedule`} action={back} />
      <p className="max-w-xl text-sm text-muted">
        Appointments assigned to {member.full_name}. Prices and paid status match the main calendar.
      </p>
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
        onJob={(j) => setSelectedId(j.id)}
      />

      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selectedId ? (
          <JobPanel
            id={selectedId}
            canEdit
            isTeam={false}
            canMessage
            actorKind="cleaner"
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
    </div>
  );
}
