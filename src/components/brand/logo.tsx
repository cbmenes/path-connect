import { cn } from "@/lib/utils";

export function Wordmark({
  to = "/",
  className,
  light = false,
}: {
  to?: string;
  className?: string;
  light?: boolean;
}) {
  return (
    <a href={to} className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-md",
          light ? "bg-paper/15 text-paper" : "bg-navy text-paper",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 18c4-1 6-7 14-9" />
          <path d="M6 8.5h9.5a3 3 0 0 1 0 6H9" />
          <path d="M9 8.5v6" />
        </svg>
      </span>
      <span className={cn("font-display text-lg tracking-tight", light ? "text-paper" : "text-navy")}>
        SweepBook
      </span>
    </a>
  );
}
