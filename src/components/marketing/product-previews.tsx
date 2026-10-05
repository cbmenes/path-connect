import { Badge } from "@/components/ui/card";

function Frame({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-navy shadow-card">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-paper">
        <p className="text-sm font-medium">{title}</p>
        {meta ? <p className="text-xs text-paper/70">{meta}</p> : null}
      </div>
      <div className="bg-bg p-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-paper px-3 py-2.5 shadow-soft">{children}</div>;
}

export function SchedulingPreview() {
  const days = [
    { d: "Mon", n: "29" },
    { d: "Tue", n: "30", on: true },
    { d: "Wed", n: "1" },
    { d: "Thu", n: "2" },
    { d: "Fri", n: "3" },
  ];
  return (
    <Frame title="Week" meta="Oklahoma City">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-navy">Sep 29 – Oct 3</p>
        <div className="flex rounded-md bg-secondary p-0.5 text-xs">
          <span className="rounded px-2 py-1 text-muted">Day</span>
          <span className="rounded bg-paper px-2 py-1 font-medium text-navy shadow-soft">Week</span>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-5 gap-1">
        {days.map((day) => (
          <div
            key={day.d}
            className={
              day.on
                ? "rounded-md bg-navy px-1 py-1.5 text-center text-paper"
                : "rounded-md bg-paper px-1 py-1.5 text-center text-muted"
            }
          >
            <p className="text-xs">{day.d}</p>
            <p className="text-sm font-medium tabular">{day.n}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Row>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Nguyen — weekly — Tue 9:00</p>
              <p className="text-xs text-muted">Nichols Hills · 2.5 hr</p>
            </div>
            <Badge tone="warn">Overlaps</Badge>
          </div>
        </Row>
        <Row>
          <p className="text-sm font-medium text-ink">Brooks — biweekly — Wed 1:00</p>
          <p className="text-xs text-muted">Heritage Hills · recurring</p>
        </Row>
        <Row>
          <p className="text-sm font-medium text-ink">Harper — monthly — Thu 10:00</p>
          <p className="text-xs text-muted">1421 Drury Lane</p>
        </Row>
      </div>
    </Frame>
  );
}

export function PaymentsPreview() {
  const rows = [
    { who: "Wilson", when: "Tue visit", amount: "$165", detail: "Card on file", chip: "Receipt", tone: "navy" as const },
    { who: "Patterson", when: "Last Wednesday", amount: "$140", detail: "Marked paid (Venmo)", chip: "Paid", tone: "sage" as const },
    { who: "Ellis", when: "Completed clean", amount: "Tip", detail: "Tip requested", chip: "Requested", tone: "warn" as const },
  ];
  return (
    <Frame title="Payments" meta="This week">
      <div className="grid gap-2">
        {rows.map((row) => (
          <Row key={row.who}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {row.who} — {row.amount}
                </p>
                <p className="text-xs text-muted">
                  {row.when} · {row.detail}
                </p>
              </div>
              <Badge tone={row.tone}>{row.chip}</Badge>
            </div>
          </Row>
        ))}
      </div>
    </Frame>
  );
}

export function PortalPreview() {
  return (
    <Frame title="Client home" meta="Cam Delgado">
      <Row>
        <p className="text-xs uppercase tracking-wide text-sage">Next visit</p>
        <p className="mt-1 text-sm font-medium text-ink">Thu, Oct 2 · 9:00</p>
        <p className="text-xs text-muted">1421 Drury Lane, Nichols Hills</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center rounded-md bg-navy px-3 text-sm text-paper">Message</span>
          <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-paper px-3 text-sm text-ink">
            Cancel visit
          </span>
        </div>
      </Row>
      <div className="mt-2">
        <Row>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Sep 17 clean</p>
              <p className="text-xs text-muted">Completed · tip after the visit</p>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-md bg-sage px-3 text-sm text-accent-foreground">Tip</span>
          </div>
        </Row>
      </div>
      <p className="mt-2 rounded-lg bg-warn/15 px-3 py-2 text-xs text-warn">Inside 24 hours, the cancellation policy applies.</p>
    </Frame>
  );
}

export function ImportPreview() {
  const rows = [
    { name: "Ellen Harper", where: "1421 Drury Lane", day: "Usual day · Tue" },
    { name: "Linh Nguyen", where: "818 NW 12th", day: "Usual day · Weekly Tue" },
  ];
  return (
    <Frame title="Import clients" meta="clients.csv">
      <div className="mb-2 flex items-center justify-between rounded-lg border border-dashed border-border bg-paper px-3 py-2">
        <p className="text-xs text-muted">names, addresses, usual days</p>
        <Badge tone="navy">CSV</Badge>
      </div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <Row key={row.name}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.where} · {row.day}
                </p>
              </div>
              <Badge tone="sage">Invite sent</Badge>
            </div>
          </Row>
        ))}
      </div>
    </Frame>
  );
}

export function MessagingPreview() {
  return (
    <Frame title="Messages" meta="Separate threads">
      <div className="grid gap-2">
        <Row>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">Cam Delgado</p>
            <Badge tone="navy">Master ↔ client</Badge>
          </div>
          <p className="mt-2 rounded-md bg-sage-soft px-2 py-1.5 text-sm text-ink">Gate code is 4412. Dogs are in the yard.</p>
          <p className="mt-2 text-xs text-muted">Admin cannot see Master↔Client threads.</p>
        </Row>
        <Row>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">Lena Ruiz · crew</p>
            <Badge tone="sage">On my way</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">8:42 · Leaving Nichols Hills now.</p>
        </Row>
      </div>
    </Frame>
  );
}

export function TeamPayPreview() {
  return (
    <Frame title="Team pay" meta="Week of Sep 22">
      <div className="mb-2 flex items-center justify-between">
        <Badge tone="navy">Master</Badge>
        <p className="text-xs text-muted">Rates stay on this login</p>
      </div>
      <div className="grid gap-2">
        <Row>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Lena Ruiz</p>
              <p className="text-xs text-muted">12.5 hours</p>
            </div>
            <p className="tabular text-sm font-medium text-navy">$312.50</p>
          </div>
        </Row>
        <Row>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Avery Cole</p>
              <p className="text-xs text-muted">8 jobs</p>
            </div>
            <p className="tabular text-sm font-medium text-navy">$240.00</p>
          </div>
        </Row>
      </div>
      <p className="mt-2 text-xs text-muted">Team logins do not show these dollar rates.</p>
    </Frame>
  );
}

export function TimeOffPreview() {
  return (
    <Frame title="Time off" meta="Blocks the route">
      <div className="grid gap-2">
        <Row>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Lena Ruiz</p>
              <p className="text-xs text-muted">Oct 6–8</p>
            </div>
            <Badge tone="sage">Approved</Badge>
          </div>
        </Row>
        <Row>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Avery Cole</p>
              <p className="text-xs text-muted">Oct 10</p>
            </div>
            <Badge tone="warn">Pending</Badge>
          </div>
        </Row>
        <div className="grid grid-cols-3 gap-1">
          {[
            ["Tue 6", "Off"],
            ["Wed 7", "Off"],
            ["Thu 8", "Open"],
          ].map(([day, state]) => (
            <div
              key={day}
              className={
                state === "Off"
                  ? "rounded-md bg-navy px-2 py-2 text-paper"
                  : "rounded-md bg-paper px-2 py-2 text-ink"
              }
            >
              <p className="text-xs">{day}</p>
              <p className="text-sm font-medium">{state}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
