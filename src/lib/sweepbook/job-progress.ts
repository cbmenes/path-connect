import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertActivePlan, getActor, isOffice, masterUserId, teamCanClockIn } from "./access";
import { teamCanAccessJob } from "./assignees";
import {
  canSetProgress,
  isJobNearTerm,
  isProgressStatus,
  type ProgressStatus,
} from "./progress";

export const setJobProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; status: ProgressStatus }) => {
    if (!isProgressStatus(input.status)) throw new Error("Pick On my way, Start, or Finish.");
    return { jobId: input.jobId, status: input.status };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const jobs = await sql<{
      id: string;
      cleaner_user_id: string;
      status: string;
      start_at: string;
      progress_status: ProgressStatus | null;
      on_the_way_at: string | null;
      started_at: string | null;
      finished_at: string | null;
    }>`
      select id, cleaner_user_id, status, start_at::text as start_at,
             progress_status, on_the_way_at::text as on_the_way_at,
             started_at::text as started_at, finished_at::text as finished_at
      from jobs where id = ${data.jobId} limit 1
    `;
    const job = jobs[0];
    if (!job) throw new Error("Visit not found.");
    if (actor.kind === "client" || actor.kind === "none" || actor.kind === "client_unlinked") {
      throw new Error("Not allowed.");
    }
    const ownerId = masterUserId(actor);
    if (job.cleaner_user_id !== ownerId) throw new Error("Visit not found.");
    const office = isOffice(actor);
    if (actor.kind === "team") {
      if (actor.disabled) throw new Error("Not allowed.");
      if (!teamCanClockIn(actor)) throw new Error("Clock in/out is off for this login.");
      const assigned = await teamCanAccessJob(sql, context.userId, job.id);
      if (!assigned) throw new Error("Only assigned cleaners can update this visit.");
      if (!isJobNearTerm(job.start_at) && !job.progress_status) {
        throw new Error("Status can be updated for today's visits and nearby dates.");
      }
    } else if (!office) {
      throw new Error("Not allowed.");
    } else {
      await assertActivePlan(sql, actor);
    }
    if (!canSetProgress({
      current: job.progress_status,
      next: data.status,
      isOffice: office,
      jobStatus: job.status,
    })) {
      throw new Error("That status is not available for this visit.");
    }

    const now = new Date().toISOString();
    let onTheWayAt = job.on_the_way_at;
    let startedAt = job.started_at;
    let finishedAt = job.finished_at;
    if (data.status === "on_the_way" && !onTheWayAt) onTheWayAt = now;
    if (data.status === "in_progress" && !startedAt) startedAt = now;
    if (data.status === "finished" && !finishedAt) finishedAt = now;
    const nextJobStatus = data.status === "finished" ? "completed" : job.status;

    await sql`
      update jobs set
        progress_status = ${data.status},
        on_the_way_at = ${onTheWayAt},
        started_at = ${startedAt},
        finished_at = ${finishedAt},
        status = ${nextJobStatus}
      where id = ${job.id} and cleaner_user_id = ${ownerId}
    `;
    return {
      ok: true,
      progress_status: data.status,
      on_the_way_at: onTheWayAt,
      started_at: startedAt,
      finished_at: finishedAt,
    };
  });
