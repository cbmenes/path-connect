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
import { Field, Input, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/app/visits")({ component: VisitsPage });

function VisitsPage() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const qc = useQueryClient();
  const upcoming = q.data && isClientDash(q.data) ? q.data.upcoming : [];
  const past = q.data && isClientDash(q.data) ? q.data.past : [];
  const [active, setActive] = useState<{ id: string; action: "cancel" | "reschedule" } | null>(null);
  const [note, setNote] = useState("");
  const [requestedStart, setRequestedStart] = useState("");
  const jobMeta = useQuery({
    queryKey: ["job", active?.id],
    queryFn: () => getJob({ data: active!.id }),
    enabled: Boolean(active?.id),
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Your visits" />
      <section>
        <h2 className="font-display text-xl text-navy">Upcoming</h2>
        <div className="mt-3 grid gap-2">
          {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing scheduled.</p> : upcoming.map((j) => {
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
                    <Button variant="outline" size="sm" onClick={() => { setActive({ id: j.id, action: "reschedule" }); setNote(""); setRequestedStart(""); }}>
                      Request reschedule
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setActive({ id: j.id, action: "cancel" }); setNote(""); }}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
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
      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent title={active?.action === "cancel" ? "Cancel this visit?" : "Request a new time"}>
          {jobMeta.data?.cancellationPolicy && hoursUntil(jobMeta.data.job.start_at) < 24 ? (
            <p className="mb-3 rounded-md bg-warn/15 p-3 text-sm text-warn">{jobMeta.data.cancellationPolicy}</p>
          ) : null}
          {active?.action === "reschedule" ? (
            <Field label="Requested new time">
              <Input type="datetime-local" value={requestedStart} onChange={(e) => setRequestedStart(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Note for your cleaner">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button
            className="mt-3"
            onClick={async () => {
              if (!active) return;
              const res = await clientCancelOrReschedule({
                data: { id: active.id, action: active.action, note, requestedStart: requestedStart || undefined },
              });
              toast.success(active.action === "cancel" ? "Visit cancelled. Your cleaner was notified." : "Reschedule requested. Your cleaner was notified.");
              if (res.within24) toast.message("This visit was inside 24 hours.");
              setActive(null);
              await qc.invalidateQueries({ queryKey: ["dashboard"] });
              await qc.invalidateQueries({ queryKey: ["jobs"] });
            }}
          >
            Confirm
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
