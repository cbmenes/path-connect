import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicBookUrl } from "@/components/app/public-book-url";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/card";
import { formatPhoneAsTyped } from "@/lib/sweepbook/people";
import { listCleanRequests, serviceTypeLabel } from "@/lib/sweepbook/requests";
import { formatDateTime } from "@/lib/sweepbook/time";

export const Route = createFileRoute("/app/requests/")({ component: RequestsPage });

function statusTone(status: string): "navy" | "sage" | "muted" {
  if (status === "pending") return "navy";
  if (status === "accepted") return "sage";
  return "muted";
}

function statusLabel(status: string) {
  if (status === "pending") return "new";
  return status;
}

function RequestsPage() {
  const q = useQuery({ queryKey: ["clean-requests"], queryFn: () => listCleanRequests() });
  const rows = q.data ?? [];

  return (
    <div className="grid gap-5">
      <PageHeader title="Booking Form / Requests" eyebrow="Public form" />
      <PublicBookUrl />
      <p className="text-sm text-muted">
        Public form submissions for this company only. Accepting a request adds one scheduled visit — it does not start
        a series or charge a card.
      </p>
      {q.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : rows.length === 0 ? (
        <EmptyState title="No requests yet" body="Share the public booking URL above. New requests will land here." />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/app/requests/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3 shadow-soft"
            >
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted">
                  {serviceTypeLabel(r.service_type)}
                  {r.preferred_date ? ` · ${r.preferred_date}` : ""}
                  {r.preferred_time ? ` ${r.preferred_time}` : ""}
                </p>
                <p className="text-xs text-muted">{r.address || "No address"}</p>
                <p className="text-xs text-muted">
                  {formatPhoneAsTyped(r.phone) || "No phone"}
                  {r.email ? ` · ${r.email}` : ""}
                </p>
                <p className="text-xs text-muted">{formatDateTime(r.created_at)}</p>
              </div>
              <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
