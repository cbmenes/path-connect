import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Six equal 4×4 rounded squares. Gap is 1 (25% of the unit). Last square is sage. */
const UNIT = 4;
const GAP = 1;
const UNIT_RX = 1;
const X0 = 5;
const Y = 18;
const DAYS = [0, 1, 2, 3, 4, 5].map((i) => X0 + i * (UNIT + GAP));

/** Navy squircle and week strip. No wordmark. */
export function CrewWeekMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1B365D" />
      {DAYS.map((x, i) => (
        <rect
          key={x}
          x={x}
          y={Y}
          width={UNIT}
          height={UNIT}
          rx={UNIT_RX}
          fill={i === DAYS.length - 1 ? "#7D9A7A" : "#F7F4EE"}
        />
      ))}
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
