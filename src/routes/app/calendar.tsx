import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { PageHeader } from "@/components/app/empty-state";
import { OfficeCalendar } from "@/components/app/office-calendar";
import type { CalView } from "@/components/app/calendar-board";

type Search = { view?: CalView; date?: string; start?: string; job?: string };

export const Route = createFileRoute("/app/calendar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: s.view === "day" || s.view === "month" || s.view === "week" ? s.view : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    start: typeof s.start === "string" ? s.start : undefined,
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });

  if (actor.data?.kind === "client") {
    return (
      <div>
        <PageHeader title="Calendar" />
        <p className="mt-2 text-sm text-muted">
          Your visits live on the{" "}
          <Link to="/app/visits" className="text-navy underline">
            Visits
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  return (
    <OfficeCalendar
      urlSearch={search}
      onUrlChange={(next) => {
        void navigate({ to: "/app/calendar", search: next, replace: true });
      }}
    />
  );
}
