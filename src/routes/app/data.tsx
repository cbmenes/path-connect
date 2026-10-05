import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { CsvImportPanel } from "@/components/app/csv-impex";
import { PageHeader } from "@/components/app/empty-state";
import type { CsvKind } from "@/lib/sweepbook/csv";

type Search = { kind?: CsvKind };

export const Route = createFileRoute("/app/data")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    kind: s.kind === "clients" || s.kind === "team" || s.kind === "schedule" ? s.kind : undefined,
  }),
  component: DataPage,
});

function DataPage() {
  const search = Route.useSearch();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  if (actor.data && actor.data.kind !== "cleaner") {
    return <Navigate to="/app" />;
  }
  return (
    <div className="grid gap-5">
      <PageHeader title="Data" />
      <p className="max-w-xl text-sm text-muted">
        Import and export clients, team cleaners, and the schedule. Cards and passwords are never imported.
      </p>
      <CsvImportPanel key={search.kind ?? "clients"} initialKind={search.kind ?? "clients"} />
    </div>
  );
}
