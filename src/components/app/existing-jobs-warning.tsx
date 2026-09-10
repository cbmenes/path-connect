import { Link } from "@tanstack/react-router";
import type { TimeOffJobConflict } from "@/lib/sweepbook/time-off";
import { calendarAppointmentSearch, formatDateTime } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ExistingJobsWarning({
  open,
  jobs,
  name,
  onClose,
}: {
  open: boolean;
  jobs: TimeOffJobConflict[];
  name: string;
  onClose: () => void;
}) {
  if (!jobs.length) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent title="They already have jobs on those days">
        <p className="text-sm text-muted">
          {name} is now marked off, but {jobs.length} existing visit{jobs.length === 1 ? "" : "s"}{" "}
          {jobs.length === 1 ? "stays" : "stay"} assigned. Reassign if you need coverage.
        </p>
        <ul className="mt-3 grid gap-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to="/app/calendar"
                search={calendarAppointmentSearch(job.id, job.startAt)}
                className="block rounded-md bg-warn/15 px-3 py-2 text-sm text-navy underline"
                onClick={onClose}
              >
                {job.clientName} · {formatDateTime(job.startAt)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
