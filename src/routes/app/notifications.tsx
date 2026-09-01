import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { handleNotification, listNotifications, markNotificationsRead } from "@/lib/sweepbook/notifications";
import { calendarAppointmentSearch, formatDateTime } from "@/lib/sweepbook/time";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function kindLabel(kind: string) {
  if (kind === "cancel") return "Cancelled";
  if (kind === "tip") return "Tip";
  if (kind === "reschedule") return "Reschedule";
  return kind.replaceAll("_", " ");
}

function NotificationsPage() {
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const qc = useQueryClient();

  useEffect(() => {
    void markNotificationsRead({ data: {} })
      .then(() => qc.invalidateQueries({ queryKey: ["badges"] }))
      .then(() => qc.invalidateQueries({ queryKey: ["dashboard"] }))
      .catch(() => undefined);
  }, [qc]);

  const rows = q.data ?? [];

  return (
    <div className="grid gap-5">
      <PageHeader title="Notifications" />
      {q.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : rows.length === 0 ? (
        <EmptyState title="All quiet" body="Cancellations, tips, and team updates will show up here." />
      ) : (
        <div className="grid gap-2">
          {rows.map((n) => {
            const needsDecision = n.kind === "reschedule" && (n.status === "unread" || n.status === "read");
            const search = n.job_id ? calendarAppointmentSearch(n.job_id, n.requested_start_at) : null;
            return (
              <Card key={n.id} className={cn("grid gap-2 p-4", n.status === "unread" && "ring-2 ring-sage")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-sage">{kindLabel(n.kind)}</p>
                    <p className="font-medium">{n.title}</p>
                    {n.client_name ? <p className="text-sm text-muted">{n.client_name}</p> : null}
                    {n.requested_start_at ? (
                      <p className="text-sm">{formatDateTime(n.requested_start_at)}</p>
                    ) : null}
                    {n.body ? <p className="text-sm text-muted">{n.body}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                  </div>
                  <span className="text-xs capitalize text-muted">{n.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {needsDecision ? (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await handleNotification({ data: { id: n.id, action: "approve" } });
                          toast.success("Approved.");
                          await qc.invalidateQueries({ queryKey: ["notifications"] });
                          await qc.invalidateQueries({ queryKey: ["jobs"] });
                          await qc.invalidateQueries({ queryKey: ["dashboard"] });
                          await qc.invalidateQueries({ queryKey: ["badges"] });
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await handleNotification({ data: { id: n.id, action: "decline" } });
                          toast.message("Declined.");
                          await qc.invalidateQueries({ queryKey: ["notifications"] });
                          await qc.invalidateQueries({ queryKey: ["jobs"] });
                          await qc.invalidateQueries({ queryKey: ["dashboard"] });
                          await qc.invalidateQueries({ queryKey: ["badges"] });
                        }}
                      >
                        Decline
                      </Button>
                    </>
                  ) : null}
                  {n.kind === "tip" ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/app/payments"
                        onClick={() => {
                          void markNotificationsRead({ data: { id: n.id } });
                        }}
                      >
                        Payments
                      </Link>
                    </Button>
                  ) : null}
                  {search && n.job_id ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/app/calendar"
                        search={search}
                        onClick={() => {
                          void markNotificationsRead({ data: { id: n.id } });
                        }}
                      >
                        Open appointment
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {needsDecision ? <p className="text-xs text-sage">Needs a decision.</p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
