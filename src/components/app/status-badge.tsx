import { Badge } from "@/components/ui/card";
import type { InvoiceStatus, JobStatus, JobWithClient } from "@/lib/sweepbook/types";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { tone: "navy" | "sage" | "warn" | "danger" | "muted"; label: string }> = {
    scheduled: { tone: "navy", label: "Scheduled" },
    completed: { tone: "sage", label: "Completed" },
    cancelled: { tone: "muted", label: "Cancelled" },
    reschedule_requested: { tone: "warn", label: "Reschedule requested" },
  };
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { tone: "navy" | "sage" | "warn" | "danger" | "muted"; label: string }> = {
    unpaid: { tone: "warn", label: "Unpaid" },
    paid: { tone: "sage", label: "Paid" },
    failed: { tone: "danger", label: "Failed" },
    void: { tone: "muted", label: "Void" },
  };
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function VisitStatusBadge({
  job,
  hideMoney,
}: {
  job: Pick<JobWithClient, "status" | "payment_status">;
  hideMoney?: boolean;
}) {
  if (hideMoney) {
    const status = job.status === "completed" ? "scheduled" : job.status;
    return <JobStatusBadge status={status} />;
  }
  if (job.status === "cancelled" || job.status === "reschedule_requested") {
    return <JobStatusBadge status={job.status} />;
  }
  if (job.payment_status === "paid") return <InvoiceStatusBadge status="paid" />;
  if (job.payment_status === "failed") return <InvoiceStatusBadge status="failed" />;
  if (job.payment_status === "unpaid") return <InvoiceStatusBadge status="unpaid" />;
  return <JobStatusBadge status="scheduled" />;
}
