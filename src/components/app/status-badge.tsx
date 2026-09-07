import { Badge } from "@/components/ui/card";
import { isOnOrBeforeLocalToday } from "@/lib/sweepbook/time";
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

export type TilePayLabel = "Paid" | "Unpaid" | "Cancelled";

type PayJob = Pick<JobWithClient, "status"> & {
  payment_status?: InvoiceStatus | null;
  start_at?: string;
};

export function jobTilePayLabel(job: PayJob): TilePayLabel | null {
  if (job.status === "cancelled") return "Cancelled";
  // Paid / Unpaid only on the viewer's local today or earlier — never on future dates.
  if (job.start_at && !isOnOrBeforeLocalToday(job.start_at)) return null;
  if (job.payment_status === "paid") return "Paid";
  return "Unpaid";
}

/** Compact Paid / Unpaid / Cancelled chip for calendar tiles. */
export function TilePayBadge({
  job,
  invert,
}: {
  job: PayJob;
  invert?: boolean;
}) {
  const label = jobTilePayLabel(job);
  if (!label) return null;
  const tone =
    label === "Paid"
      ? "bg-sage-soft text-success"
      : label === "Unpaid"
        ? invert
          ? "bg-warn text-ink"
          : "bg-warn/15 text-warn"
        : invert
          ? "bg-paper/20 text-paper"
          : "bg-secondary text-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm px-1 py-px text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export function VisitStatusBadge({
  job,
  hideMoney,
}: {
  job: PayJob;
  hideMoney?: boolean;
}) {
  if (hideMoney) {
    const status = job.status === "completed" ? "scheduled" : job.status;
    return <JobStatusBadge status={status} />;
  }
  if (job.status === "cancelled" || job.status === "reschedule_requested") {
    return <JobStatusBadge status={job.status} />;
  }
  if (job.start_at && !isOnOrBeforeLocalToday(job.start_at)) return null;
  if (job.payment_status === "paid") return <InvoiceStatusBadge status="paid" />;
  if (job.payment_status === "failed") return <InvoiceStatusBadge status="failed" />;
  if (job.payment_status === "unpaid") return <InvoiceStatusBadge status="unpaid" />;
  return <JobStatusBadge status="scheduled" />;
}
