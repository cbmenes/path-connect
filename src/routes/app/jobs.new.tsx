import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createJob } from "@/lib/sweepbook/jobs";
import { chicagoDate, partsInChicago } from "@/lib/sweepbook/time";
import { JobForm } from "@/components/app/job-form";
import { PageHeader } from "@/components/app/empty-state";

type Search = { start?: string; clientId?: string };

export const Route = createFileRoute("/app/jobs/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    start: typeof s.start === "string" ? s.start : undefined,
    clientId: typeof s.clientId === "string" ? s.clientId : undefined,
  }),
  component: NewJob,
});

function NewJob() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-lg grid gap-5">
      <PageHeader title="New visit" />
      <JobForm
        showAssign
        initial={{ startLocal: search.start, clientId: search.clientId }}
        submitting={busy}
        submitLabel="Add to the book"
        onSubmit={async (input) => {
          setBusy(true);
          try {
            const res = await createJob({ data: input });
            if (res.conflictCount) toast.message(`Saved with ${res.conflictCount} overlap warning${res.conflictCount === 1 ? "" : "s"}.`);
            else toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
            await qc.invalidateQueries({ queryKey: ["jobs"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
            const start = input.startLocal || res.startAt;
            let date: string | undefined;
            if (start) {
              const d = start.includes("T") && !start.endsWith("Z")
                ? chicagoDate(...(start.slice(0, 10).split("-").map(Number) as [number, number, number]), 0, 0)
                : new Date(start);
              const p = partsInChicago(d);
              date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
            }
            await navigate({ to: "/app/calendar", search: { view: "week", date } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
