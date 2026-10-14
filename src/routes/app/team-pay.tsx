import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { downloadCsv, toCsv } from "@/lib/sweepbook/csv";
import {
  formatPayRate,
  getTeamPayTally,
  payTypeLabel,
} from "@/lib/sweepbook/team-pay";
import { chicagoPayWeek, money } from "@/lib/sweepbook/time";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/team-pay")({ component: TeamPayPage });

function hoursLabel(hours: number) {
  const n = Math.round(hours * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function TeamPayPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const defaults = useMemo(() => chicagoPayWeek(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [includeTips, setIncludeTips] = useState(false);
  const office = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  const tally = useQuery({
    queryKey: ["team-pay", from, to],
    queryFn: () => getTeamPayTally({ data: { from, to } }),
    enabled: Boolean(from && to && office),
  });

  if (actor.data?.kind === "client") return <Navigate to="/app/visits" />;
  if (actor.data?.kind === "team") {
    return <p className="text-muted">Team pay is only visible to the office.</p>;
  }
  const locked = tally.data?.locked === true;

  const all = tally.data?.rows ?? [];
  const rated = all.filter((r) => r.payType !== "none");
  const unrated = all.filter((r) => r.payType === "none");
  const totalOwed = rated.reduce((n, r) => n + r.jobOwedCents + (includeTips ? r.tipsCents : 0), 0);
  const uniqueTips = tally.data?.uniqueTipsCents ?? 0;

  function exportCsv() {
    const headers = ["cleaner", "pay_type", "rate", "jobs", "hours", "owed", "tips", "note"];
    const rows = rated.map((r) => ({
      cleaner: r.name,
      pay_type: payTypeLabel(r.payType),
      rate: formatPayRate(r.payType, r.payAmount),
      jobs: r.jobCount,
      hours: hoursLabel(r.hours),
      owed: ((r.jobOwedCents + (includeTips ? r.tipsCents : 0)) / 100).toFixed(2),
      tips: (r.tipsCents / 100).toFixed(2),
      note: r.payNote ?? "",
    }));
    rows.push({
      cleaner: "Total",
      pay_type: "",
      rate: includeTips ? "Includes tips" : "Jobs only",
      jobs: rated.reduce((n, r) => n + r.jobCount, 0),
      hours: hoursLabel(rated.reduce((n, r) => n + r.hours, 0)),
      owed: (totalOwed / 100).toFixed(2),
      tips: (uniqueTips / 100).toFixed(2),
      note: "",
    });
    downloadCsv(`crewweek-team-pay-${from}-to-${to}.csv`, toCsv(headers, rows));
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Team pay"
        action={
          locked ? null : (
            <Button variant="outline" asChild>
              <Link to="/app/team">Edit rates</Link>
            </Button>
          )
        }
      />
      <p className="max-w-xl text-sm text-muted">
        Team pay tracks what you owe cleaners. It does not send payouts or handle tax.
      </p>
      {locked ? (
        <Card>
          <p className="text-sm text-ink">
            Included in the Office Subscription. Cleaner rates are set on the Team page. The tally is available on the Office Subscription.
          </p>
        </Card>
      ) : null}

      {locked ? null : (
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-0.5"
            onClick={() => {
              const w = chicagoPayWeek();
              setFrom(w.from);
              setTo(w.to);
            }}
          >
            This week
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={includeTips} onChange={(e) => setIncludeTips(e.target.checked)} />
          Include tips in owed
        </label>
        <p className="text-xs text-muted">
          Tips stay listed on their own. They are added to owed only when this box is checked.
        </p>
      </Card>
      )}

      {locked ? null : tally.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-secondary" />
      ) : tally.error ? (
        <p className="text-danger">{(tally.error as Error).message}</p>
      ) : rated.length === 0 ? (
        <Card>
          <p className="font-medium text-navy">No rates set</p>
          <p className="mt-1 text-sm text-muted">
            Set an hourly, per-job, or percent rate on the{" "}
            <Link to="/app/team" className="text-navy underline">
              Team
            </Link>{" "}
            tab. Cleaners with type None stay out of this tally.
          </p>
        </Card>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-xl bg-paper shadow-card max-md:max-w-[calc(100vw-2rem)]">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-3 font-medium">Cleaner</th>
                <th className="px-3 py-3 font-medium">Rate</th>
                <th className="px-3 py-3 font-medium">Jobs</th>
                <th className="px-3 py-3 font-medium">Hours</th>
                <th className="px-3 py-3 font-medium">Tips</th>
                <th className="px-3 py-3 font-medium">Owed</th>
              </tr>
            </thead>
            <tbody>
              {rated.map((r) => {
                const owed = r.jobOwedCents + (includeTips ? r.tipsCents : 0);
                return (
                  <tr key={r.userId} className="border-b border-border/70">
                    <td className="px-3 py-3">
                      <p className="font-medium text-navy">{r.name}</p>
                      {r.payNote ? <p className="text-xs text-muted">{r.payNote}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{formatPayRate(r.payType, r.payAmount)}</td>
                    <td className="px-3 py-3 tabular">{r.jobCount}</td>
                    <td className="px-3 py-3 tabular">{hoursLabel(r.hours)}</td>
                    <td className="px-3 py-3 tabular">{money(r.tipsCents)}</td>
                    <td className="px-3 py-3 tabular font-medium">{money(owed)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-3 font-medium text-navy" colSpan={4}>
                  Total owed
                </td>
                <td className="px-3 py-3 tabular text-muted">{money(uniqueTips)}</td>
                <td className="px-3 py-3 tabular font-display text-lg text-navy">{money(totalOwed)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!locked && unrated.length ? (
        <p className="text-sm text-muted">
          Not in tally (no rate set): {unrated.map((r) => r.name).join(", ")}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={locked || !rated.length} onClick={exportCsv}>
          Export CSV
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/app/payments">Back to Payments</Link>
        </Button>
      </div>
    </div>
  );
}
