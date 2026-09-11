import { addDaysChicago, chicagoDayKey } from "./time";
import type { ProgressStatus } from "./types";

export type { ProgressStatus };

export function isProgressStatus(value: unknown): value is ProgressStatus {
  return value === "on_the_way" || value === "in_progress" || value === "finished";
}

/** Office calendar / day-sheet tile label. */
export function officeProgressLabel(status: ProgressStatus | null | undefined) {
  if (status === "on_the_way") return "On the way";
  if (status === "in_progress") return "In progress";
  if (status === "finished") return "Finished";
  return null;
}

/** Client portal copy — today's job only. */
export function clientProgressLabel(status: ProgressStatus | null | undefined) {
  if (status === "on_the_way") return "Cleaner is on the way";
  if (status === "in_progress") return "In progress";
  if (status === "finished") return "Finished";
  return null;
}

export function effectiveProgressStatus(job: {
  status?: string;
  progress_status?: ProgressStatus | null;
}): ProgressStatus | null {
  if (job.progress_status) return job.progress_status;
  if (job.status === "completed") return "finished";
  return null;
}

/** Yesterday, today, or tomorrow in America/Chicago. */
export function isJobNearTerm(startAt: Date | string, now: Date = new Date()) {
  const key = chicagoDayKey(startAt);
  const today = chicagoDayKey(now);
  const yesterday = chicagoDayKey(addDaysChicago(now, -1));
  const tomorrow = chicagoDayKey(addDaysChicago(now, 1));
  return key === today || key === yesterday || key === tomorrow;
}

export function canSetProgress(opts: {
  current: ProgressStatus | null;
  next: ProgressStatus;
  isOffice: boolean;
  jobStatus: string;
}): boolean {
  if (opts.jobStatus === "cancelled") return false;
  if (opts.current === "finished" || opts.jobStatus === "completed") return false;
  if (opts.next === "on_the_way") return opts.current == null;
  if (opts.next === "in_progress") return opts.current == null || opts.current === "on_the_way";
  if (opts.next === "finished") {
    if (opts.isOffice) return true;
    return opts.current === "in_progress";
  }
  return false;
}
