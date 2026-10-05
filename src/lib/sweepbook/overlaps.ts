import { addMinutes, formatDateTime } from "@/lib/sweepbook/time";

export type OverlapNote = {
  cleanerUserId: string;
  cleanerName: string;
  otherJobId: string;
  otherClientName: string;
  otherStartAt: string;
};

export type OverlapJob = {
  id: string;
  start_at: string;
  duration_min: number;
  status: string;
  client_name: string;
  assigned_to_user_id?: string | null;
  assignee_name?: string | null;
  assignees?: { user_id: string; full_name?: string | null }[];
};

function jobEnd(startAt: string, durationMin: number) {
  return addMinutes(new Date(startAt), durationMin);
}

/** Exclusive end: back-to-back at the same timestamp is not an overlap. */
export function timesOverlapIso(aStart: string, aMin: number, bStart: string, bMin: number) {
  const a0 = new Date(aStart);
  const b0 = new Date(bStart);
  return a0 < jobEnd(bStart, bMin) && b0 < jobEnd(aStart, aMin);
}

export function assigneeIds(job: OverlapJob): string[] {
  const ids = new Set<string>();
  for (const a of job.assignees ?? []) {
    if (a.user_id) ids.add(a.user_id);
  }
  if (job.assigned_to_user_id) ids.add(job.assigned_to_user_id);
  return [...ids];
}

function assigneeName(job: OverlapJob, userId: string) {
  const hit = job.assignees?.find((a) => a.user_id === userId);
  const named = hit?.full_name?.trim();
  if (named) return named;
  if (job.assignees?.length === 1 && job.assignee_name?.trim()) return job.assignee_name.trim();
  return "Cleaner";
}

function addNote(map: Map<string, OverlapNote[]>, jobId: string, note: OverlapNote) {
  const list = map.get(jobId) ?? [];
  if (list.some((n) => n.cleanerUserId === note.cleanerUserId && n.otherJobId === note.otherJobId)) {
    return;
  }
  list.push(note);
  map.set(jobId, list);
}

/** Same assigned cleaner on two non-cancelled jobs whose times overlap. */
export function indexOverlaps(
  jobs: OverlapJob[],
  opts?: { onlyCleanerUserId?: string },
): Map<string, OverlapNote[]> {
  const map = new Map<string, OverlapNote[]>();
  const only = opts?.onlyCleanerUserId;
  const active = jobs.filter((j) => j.status !== "cancelled");
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (!timesOverlapIso(a.start_at, a.duration_min, b.start_at, b.duration_min)) continue;
      const aIds = new Set(assigneeIds(a));
      const bIds = new Set(assigneeIds(b));
      for (const id of aIds) {
        if (!bIds.has(id)) continue;
        if (only && id !== only) continue;
        addNote(map, a.id, {
          cleanerUserId: id,
          cleanerName: assigneeName(a, id),
          otherJobId: b.id,
          otherClientName: b.client_name,
          otherStartAt: b.start_at,
        });
        addNote(map, b.id, {
          cleanerUserId: id,
          cleanerName: assigneeName(b, id),
          otherJobId: a.id,
          otherClientName: a.client_name,
          otherStartAt: a.start_at,
        });
      }
    }
  }
  return map;
}

export function overlapLine(note: OverlapNote) {
  return `${note.cleanerName} overlaps ${note.otherClientName} at ${formatDateTime(note.otherStartAt)}.`;
}

export function overlapTooltip(notes: OverlapNote[]) {
  if (!notes.length) return undefined;
  return notes.map(overlapLine).join(" ");
}
