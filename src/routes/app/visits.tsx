import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getDashboard, isClientDash } from "@/lib/sweepbook/dashboard";
import { clientCancelOrReschedule, getJob } from "@/lib/sweepbook/jobs";
import { formatDateTime, formatHours, hoursUntil, money } from "@/lib/sweepbook/time";
import { VisitStatusBadge } from "@/components/app/status-badge";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/app/visits")({ component: VisitsPage });

function VisitsPage() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const qc = useQueryClient();
  const upcoming = q.data && isClientDash(q.data) ? q.data.upcoming : [];
  const past = q.data && isClientDash(q.data) ? q.data.past : [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const jobMeta = useQuery({
    queryKey: ["job", activeId],
    queryFn: () => getJob({ data: activeId! }),
    enabled: Boolean(activeId),
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Your visits" />
      <section>
        <h2 className="font-display text-xl text-navy">Upcoming</h2>
        <div className="mt-3 grid gap-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled.</p>
          ) : (
            upcoming.map((j) => {
              const soon = hoursUntil(j.start_at) < 24;
              return (
                <Card key={j.id} className="grid gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatDateTime(j.start_at)}</p>
                      <p className="text-sm text-muted">
                        {formatHours(j.duration_min)} · {money(j.price_cents)}
                      </p>
                      <p className="text-xs text-muted">{j.address}</p>
                    </div>
                    <VisitStatusBadge job={j} />
                  </div>
                  {soon ? <p className="text-xs text-warn">Inside 24 hours — the cancellation policy applies.</p> : null}
                  {j.status === "scheduled" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveId(j.id);
                          setNote("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl text-navy">Past</h2>
        <div className="mt-3 grid gap-2">
          {past.map((j) => (
            <Card key={j.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{formatDateTime(j.start_at)}</p>
                <p className="text-xs text-muted">{money(j.price_cents)}</p>
              </div>
              <VisitStatusBadge job={j} />
            </Card>
          ))}
        </div>
      </section>
      <Dialog open={Boolean(activeId)} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent title="Are you sure you want to cancel this appointment?">
          {jobMeta.data?.cancellationPolicy && hoursUntil(jobMeta.data.job.start_at) < 24 ? (
            <p className="mb-3 rounded-md bg-warn/15 p-3 text-sm text-warn">{jobMeta.data.cancellationPolicy}</p>
          ) : null}
          <p className="mb-3 text-sm text-muted">Your cleaner will be notified. You can ask them to book a new time.</p>
          <Field label="Note for your cleaner">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setActiveId(null)}>
              Keep appointment
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!activeId) return;
                setBusy(true);
                try {
                  const res = await clientCancelOrReschedule({
                    data: { id: activeId, action: "cancel", note },
                  });
                  toast.success("Visit cancelled. Your cleaner was notified.");
                  if (res.within24) toast.message("This visit was inside 24 hours.");
                  setActiveId(null);
                  await qc.invalidateQueries({ queryKey: ["dashboard"] });
                  await qc.invalidateQueries({ queryKey: ["jobs"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not cancel.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Cancelling…" : "Cancel appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
