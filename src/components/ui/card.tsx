import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl bg-paper p-5 text-ink shadow-card", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "navy",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "navy" | "sage" | "warn" | "danger" | "muted";
}) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    sage: "bg-sage-soft text-success",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/10 text-danger",
    muted: "bg-secondary text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
