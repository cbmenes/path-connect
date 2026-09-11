import { useState } from "react";
import { toast } from "sonner";
import { setJobProgress } from "@/lib/sweepbook/job-progress";
import {
  canSetProgress,
  clientProgressLabel,
  effectiveProgressStatus,
  isJobNearTerm,
  officeProgressLabel,
  type ProgressStatus,
} from "@/lib/sweepbook/progress";
import { formatDateTime, sameChicagoDay } from "@/lib/sweepbook/time";
import type { JobWithClient } from "@/lib/sweepbook/types";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProgressJob = Pick<JobWithClient, "id" | "status" | "start_at"> & {
  progress_status?: ProgressStatus | null;
  on_the_way_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export function TileProgressBadge({
  job,
  invert,
  variant = "office",
}: {
  job: ProgressJob;
  invert?: boolean;
  variant?: "office" | "client";
}) {
  if (!sameChicagoDay(job.start_at, new Date())) return null;
  const status = effectiveProgressStatus(job);
  const label = variant === "client" ? clientProgressLabel(status) : officeProgressLabel(status);
  if (!label) return null;
  const tone =
    status === "finished"
      ? invert
        ? "bg-sage text-navy"
        : "bg-sage-soft text-success"
      : status === "in_progress"
        ? invert
          ? "bg-paper text-navy"
          : "bg-navy/10 text-navy"
        : invert
          ? "bg-paper/20 text-paper"
          : "bg-secondary text-muted";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function ClientJobStatus({ job, className }: { job: ProgressJob; className?: string }) {
  if (!sameChicagoDay(job.start_at, new Date())) return null;
  const label = clientProgressLabel(effectiveProgressStatus(job));
  if (!label) return null;
  return <p className={cn("text-sm font-medium text-navy", className)}>{label}</p>;
}

export function JobProgress({
  job,
  isOffice,
  isAssignedTeam,
  onChanged,
}: {
  job: ProgressJob;
  isOffice: boolean;
  isAssignedTeam: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<ProgressStatus | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const current = effectiveProgressStatus(job);
  const canAct =
    (isOffice || (isAssignedTeam && (isJobNearTerm(job.start_at) || Boolean(job.progress_status)))) &&
    job.status !== "cancelled" &&
    current !== "finished" &&
    job.status !== "completed";

  const showOnTheWay = canAct && canSetProgress({ current, next: "on_the_way", isOffice, jobStatus: job.status });
  const showStart = canAct && canSetProgress({ current, next: "in_progress", isOffice, jobStatus: job.status });
  const showFinish = canAct && canSetProgress({ current, next: "finished", isOffice, jobStatus: job.status });
  const label = officeProgressLabel(current);

  async function setStatus(status: ProgressStatus) {
    setBusy(status);
    try {
      await setJobProgress({ data: { jobId: job.id, status } });
      toast.success(
        status === "on_the_way" ? "On the way." : status === "in_progress" ? "Job started." : "Job finished.",
      );
      setFinishOpen(false);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusy(null);
    }
  }

  if (!isOffice && !isAssignedTeam && !label) return null;

  return (
    <div className="grid gap-3 rounded-xl bg-secondary p-3">
      <div>
        <p className="text-sm font-medium">Cleaner status</p>
        <p className="text-xs text-muted">{label ?? "Not started"}</p>
      </div>
      {job.on_the_way_at || job.started_at || job.finished_at ? (
        <ul className="grid gap-1 text-xs text-muted">
          {job.on_the_way_at ? <li>On my way at {formatDateTime(job.on_the_way_at)}</li> : null}
          {job.started_at ? <li>Started at {formatDateTime(job.started_at)}</li> : null}
          {job.finished_at ? <li>Finished at {formatDateTime(job.finished_at)}</li> : null}
        </ul>
      ) : null}
      {showOnTheWay || showStart || showFinish ? (
        <div className="flex flex-wrap gap-2">
          {showOnTheWay ? (
            <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void setStatus("on_the_way")}>
              {busy === "on_the_way" ? "Saving…" : "On my way"}
            </Button>
          ) : null}
          {showStart ? (
            <Button size="sm" disabled={Boolean(busy)} onClick={() => void setStatus("in_progress")}>
              {busy === "in_progress" ? "Saving…" : "Start job"}
            </Button>
          ) : null}
          {showFinish ? (
            <Button size="sm" variant="accent" disabled={Boolean(busy)} onClick={() => setFinishOpen(true)}>
              Finish job
            </Button>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title="Finish this job?"
        body="This marks the visit finished for the team and the client."
        cancelLabel="Keep working"
        confirmLabel="Finish job"
        busyLabel="Finishing…"
        busy={busy === "finished"}
        confirmVariant="primary"
        onConfirm={() => setStatus("finished")}
      />
    </div>
  );
}
