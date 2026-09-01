import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-paper/60 px-6 py-12 text-center">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}
