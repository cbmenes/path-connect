import { overlapLine, overlapTooltip, type OverlapNote } from "@/lib/sweepbook/overlaps";
import { cn } from "@/lib/utils";

export function TileOverlapBadge({
  compact,
  invert,
}: {
  compact?: boolean;
  invert?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-flex min-w-0 items-center gap-0.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
        <span
          className={cn(
            "truncate rounded-sm px-0.5 font-bold uppercase tracking-wide text-[8px]",
            invert ? "bg-warn text-ink" : "text-warn",
          )}
        >
          Overlap
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
        invert ? "bg-warn text-ink" : "bg-warn/15 text-warn",
      )}
    >
      Overlap
    </span>
  );
}

export function OverlapDetails({ notes }: { notes: OverlapNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="rounded-xl border border-warn/35 bg-warn/10 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-warn">Overlap</p>
      <ul className="mt-1 grid gap-1 text-sm text-navy">
        {notes.map((note) => (
          <li key={`${note.cleanerUserId}-${note.otherJobId}-${note.otherStartAt}`}>
            {overlapLine(note)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function jobOverlapTitle(notes: OverlapNote[]) {
  return overlapTooltip(notes);
}
