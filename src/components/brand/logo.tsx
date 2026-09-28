import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const TICKS = [3, 6, 9, 12, 15, 18];

/** Navy tile and week strip. No wordmark. */
export function CrewWeekMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1B365D" />
      {TICKS.map((x) => (
        <rect key={x} x={x} y="12" width="2" height="8" rx="0.7" fill="#F7F4EE" />
      ))}
      <rect x="21" y="12" width="8" height="8" rx="1.8" fill="#7D9A7A" />
    </svg>
  );
}

/** Primary lockup: week-strip tile plus the CrewWeek wordmark. */
export function CrewWeekLogo({
  to = "/",
  className,
  light = false,
}: {
  to?: string;
  className?: string;
  light?: boolean;
}) {
  return (
    <a href={to} className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("inline-grid size-8 shrink-0", light && "rounded-[22%] ring-1 ring-[#F7F4EE]/50")}>
        <CrewWeekMark className="size-8" />
      </span>
      <span
        className={cn(
          "font-sans text-lg font-semibold tracking-tight",
          light ? "text-[#F7F4EE]" : "text-[#1B365D]",
        )}
      >
        {APP_NAME}
      </span>
    </a>
  );
}

export const Wordmark = CrewWeekLogo;
