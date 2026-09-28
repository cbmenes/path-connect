import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Five ivory bars, then one sage block. Even gaps, centered in the tile. */
const TICKS = [6.5, 9.9, 13.3, 16.7, 20.1];

/** Navy squircle and week strip. No wordmark. */
export function CrewWeekMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1B365D" />
      {TICKS.map((x) => (
        <rect key={x} x={x} y="16.5" width="2.2" height="7" rx="1.1" fill="#F7F4EE" />
      ))}
      <rect x="23.5" y="15" width="10" height="10" rx="2.6" fill="#7D9A7A" />
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
    <a href={to} className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("inline-grid size-10 shrink-0", light && "rounded-[30%] ring-1 ring-[#F7F4EE]/50")}>
        <CrewWeekMark className="size-10" />
      </span>
      <span
        className={cn(
          "font-sans text-lg font-semibold leading-none tracking-tight",
          light ? "text-[#F7F4EE]" : "text-[#1B365D]",
        )}
      >
        {APP_NAME}
      </span>
    </a>
  );
}

export const Wordmark = CrewWeekLogo;
