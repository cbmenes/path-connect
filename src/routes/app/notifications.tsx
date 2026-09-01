import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { handleNotification, listNotifications, markNotificationsRead } from "@/lib/sweepbook/notifications";
import { formatDateTime } from "@/lib/sweepbook/time";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const qc = useQueryClient();

  useEffect(() => {
    void markNotificationsRead({ data: {} })
      .then(() => qc.invalidateQueries({ queryKey: ["badges"] }))
      .catch(() => undefined);
  }, [qc]);

  const rows = q.data ?? [];

  return (
    <div className="grid gap-5">
      <PageHeader title="Notifications" />
      {q.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : rows.length === 0 ? (
        <EmptyState title="All quiet" body="Cancel and reschedule requests from clients will show up here." />
      ) : (
        <div className="grid gap-2">
          {rows.map((n) => {
            const open = n.status === "unread" || (n.status === "read" && (n.kind === "cancel" || n.kind === "reschedule"));
            return (
              <Card key={n.id} className={cn("grid gap-2 p-4", n.status === "unread" && "ring-2 ring-sage")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-sage">
                      {n.kind === "cancel" ? "Cancel" : n.kind === "reschedule" ? "Reschedule" : n.kind.replaceAll("_", " ")}
                    </p>
                    <p className="font-medium">{n.title}</p>
                    {n.client_name ? <p className="text-sm text-muted">{n.client_name}</p> : null}
                    {n.requested_start_at ? (
                      <p className="text-sm">Requested: {formatDateTime(n.requested_start_at)}</p>
                    ) : null}
                    {n.body ? <p className="text-sm text-muted">{n.body}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                  </div>
                  <span className="text-xs capitalize text-muted">{n.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {n.kind === "cancel" || n.kind === "reschedule" ? (
                    n.status === "approved" || n.status === "declined" ? null : (
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
                    )
                  ) : null}
                  {n.client_id ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/messages/$clientId" params={{ clientId: n.client_id }}>
                        Message
                      </Link>
                    </Button>
                  ) : null}
                  {n.job_id ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/jobs/$id" params={{ id: n.job_id }}>
                        Visit
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {open && (n.kind === "cancel" || n.kind === "reschedule") ? (
                  <p className="text-xs text-sage">Needs a decision.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
