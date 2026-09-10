import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getDashboard, isCleanerDash, isClientDash, isTeamDash, type CleanerDashboard, type ClientDashboard, type TeamDashboard } from "@/lib/sweepbook/dashboard";
import { payInvoiceAsClient, tipJob } from "@/lib/sweepbook/payments";
import { formatDateTime, formatHours, money } from "@/lib/sweepbook/time";
import { PageHeader } from "@/components/app/empty-state";
import { InvoiceStatusBadge, VisitStatusBadge } from "@/components/app/status-badge";
import { CardSelect } from "@/components/app/card-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/")({ component: AppHome });

function AppHome() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl bg-secondary" />;
  if (q.error) return <p className="text-danger">{(q.error as Error).message}</p>;
  const data = q.data;
  if (!data) return null;
  if (isCleanerDash(data)) return <CleanerHome data={data} />;
  if (isTeamDash(data)) return <TeamHome data={data} />;
  if (isClientDash(data)) return <ClientHome data={data} />;
  if (data.actor.kind === "client_unlinked") {
    return (
      <div>
        <h1 className="font-display text-3xl text-navy">Waiting on an invite</h1>
        <p className="mt-2 max-w-md text-muted">
          Ask your cleaner for an invite link. Once you open it while signed in, their visits and messages will appear here.
        </p>
      </div>
    );
  }
  return null;
}

function CleanerHome({ data }: { data: CleanerDashboard }) {
  const actor = data.actor;
  const today = data.today;
  const week = data.week;
  const unpaid = data.unpaid;
  const threads = data.threads;
  const failed = data.failed;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={actor.profile.business_name || "SweepBook"}
        title={`Good day, ${actor.profile.full_name.split(" ")[0]}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/sheet">Day sheet</Link>
            </Button>
            <Button asChild>
              <Link to="/app/jobs/new">New visit</Link>
            </Button>
          </div>
        }
      />
      {data.canCharge && failed.length ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {failed.length} failed payment{failed.length === 1 ? "" : "s"}. Ask the client to update their card.
        </div>
      ) : null}
      {data.pendingCleanRequests ? (
        <Link
          to="/app/requests"
          className="rounded-xl border border-sage/40 bg-sage-soft p-4 text-sm text-navy"
        >
          {data.pendingCleanRequests} new booking request{data.pendingCleanRequests === 1 ? "" : "s"}. Review and accept or
          decline.
        </Link>
      ) : null}
      {data.pendingRequests ? (
        <Link
          to="/app/notifications"
          className="rounded-xl border border-sage/40 bg-sage-soft p-4 text-sm text-navy"
        >
          {data.pendingRequests} request{data.pendingRequests === 1 ? "" : "s"} need a decision.
        </Link>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatLink to="/app/calendar" label="Today" value={String(today.length)} hint="visits on the book" />
        <StatLink to="/app/payments" label="Unpaid" value={money(unpaid.reduce((n, i) => n + i.amount_cents, 0))} hint={`${unpaid.length} invoices`} />
        <StatLink to="/app/messages" label="Messages" value={String(data.unread ?? 0)} hint="unread" />
        <StatLink to="/app/notifications" label="Notifications" value={String(data.unreadNotifications ?? 0)} hint="unread" />
      </div>
      {data.showRevenue ? (
      <section>
        <h2 className="font-display text-xl text-navy">Revenue</h2>
        <p className="mt-1 text-sm text-muted">Paid visits only — not unpaid invoices or your SweepBook subscription.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Stat label="This month" value={money(data.revenue.monthCents)} hint={data.revenue.monthLabel} />
          <Stat label="Year to date" value={money(data.revenue.ytdCents)} hint={`Jan 1 – now, ${data.revenue.year}`} />
        </div>
      </section>
      ) : null}
      <section>
        <h2 className="font-display text-xl text-navy">Today</h2>
        <div className="mt-3 grid gap-2">
          {today.length === 0 ? (
            <p className="text-sm text-muted">No visits today. Enjoy the gap, or add a one-off.</p>
          ) : (
            today.map((j) => (
              <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }} className="block">
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{j.client_name}</p>
                    <p className="text-sm text-muted">{formatDateTime(j.start_at)} · {formatHours(j.duration_min)}</p>
                    {j.assignees?.length ? (
                      <p className="text-xs text-muted">{j.assignees.map((a) => a.full_name).join(", ")}</p>
                    ) : null}
                  </div>
                  <p className="tabular text-navy">{money(j.price_cents)}</p>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl text-navy">Next 7 days</h2>
        <div className="mt-3 grid gap-2">
          {week.map((j) => (
            <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm font-medium">{j.client_name}</p>
                <p className="text-xs text-muted">{formatDateTime(j.start_at)}</p>
              </div>
              <VisitStatusBadge job={j} />
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-navy">Unpaid invoices</h2>
            <Link to="/app/payments" className="text-sm text-navy underline-offset-4 hover:underline">All payments</Link>
          </div>
          <div className="mt-3 grid gap-2">
            {unpaid.length === 0 ? <p className="text-sm text-muted">Nothing outstanding.</p> : unpaid.map((i) => (
              <Card key={i.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{i.client_name}</p>
                  <p className="text-xs text-muted">{i.description}</p>
                </div>
                <div className="text-right">
                  <p className="tabular">{money(i.amount_cents)}</p>
                  <InvoiceStatusBadge status={i.status} />
                </div>
              </Card>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-navy">Messages</h2>
            <Link to="/app/messages" className="text-sm text-navy underline-offset-4 hover:underline">Inbox</Link>
          </div>
          <div className="mt-3 grid gap-2">
            {threads.map((t) => (
              <Link key={t.thread_id} to="/app/messages/$clientId" params={{ clientId: t.thread_id }} className="rounded-lg bg-paper px-3 py-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.unread ? <span className="rounded-full bg-navy px-2 text-xs text-paper">{t.unread}</span> : null}
                </div>
                {t.subtitle ? <p className="text-xs text-muted">{t.subtitle}</p> : null}
                <p className="truncate text-xs text-muted">{t.last_body}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamHome({ data }: { data: TeamDashboard }) {
  const actor = data.actor;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Team cleaner"
        title={`Hi, ${actor.profile.full_name.split(" ")[0]}.`}
        action={
          <Button variant="outline" asChild>
            <Link to="/app/sheet">Day sheet</Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Today" value={String(data.today.length)} hint="assigned visits" />
        <Stat label="This week" value={String(data.week.length)} hint="on your book" />
        <Stat label="Requests" value={String(data.pendingRequests)} hint="need a look" />
      </div>
      <section>
        <h2 className="font-display text-xl text-navy">Today</h2>
        <div className="mt-3 grid gap-2">
          {data.today.length === 0 ? (
            <p className="text-sm text-muted">Nothing assigned today.</p>
          ) : (
            data.today.map((j) => (
              <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }} className="block">
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{j.client_name}</p>
                    <p className="text-sm text-muted">
                      {formatDateTime(j.start_at)} · {formatHours(j.duration_min)}
                    </p>
                    <p className="text-xs text-muted">{j.address}</p>
                  </div>
                  <VisitStatusBadge job={j} hideMoney />
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl text-navy">Next 7 days</h2>
        <div className="mt-3 grid gap-2">
          {data.week.map((j) => (
            <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm font-medium">{j.client_name}</p>
                <p className="text-xs text-muted">{formatDateTime(j.start_at)} · {formatHours(j.duration_min)}</p>
              </div>
              <VisitStatusBadge job={j} hideMoney />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatLink({
  to,
  label,
  value,
  hint,
}: {
  to: "/app/calendar" | "/app/payments" | "/app/messages" | "/app/notifications";
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link to={to} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage">
      <Card className="h-full transition-colors hover:bg-secondary">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-1 font-display text-3xl tabular-nums text-navy">{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </Card>
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums text-navy">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </Card>
  );
}

function ClientHome({ data }: { data: ClientDashboard }) {
  const actor = data.actor;
  const next = data.next;
  const unpaid = data.unpaid;
  const past = data.past.filter((j) => j.status !== "cancelled");
  const qc = useQueryClient();
  const [tipFor, setTipFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payCardId, setPayCardId] = useState("");
  const [tipCardId, setTipCardId] = useState("");
  const [tipAmount, setTipAmount] = useState("10.00");
  const [tipConfirm, setTipConfirm] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={actor.cleanerName} title={`Hello, ${actor.profile.full_name.split(" ")[0]}.`} />
      {data.failedCard ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          A card was declined.{" "}
          <Link to="/app/card" className="underline">
            Update your card
          </Link>
        </div>
      ) : null}
      <Card className="bg-navy text-paper">
        <p className="text-xs uppercase tracking-[0.16em] text-paper/60">Next cleaning</p>
        {next ? (
          <>
            <h2 className="mt-2 font-display text-3xl">{formatDateTime(next.start_at)}</h2>
            <p className="mt-1 text-paper/80">
              {next.duration_min ? `${formatHours(next.duration_min)} · ` : ""}
              {money(next.price_cents)} · {actor.cleanerName}
            </p>
            <p className="mt-2 text-sm text-paper/70">{next.address}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent" asChild>
                <Link to="/app/visits">Manage visits</Link>
              </Button>
              <Button variant="outline" className="border-paper/20 bg-transparent text-paper hover:bg-paper/10" asChild>
                <Link to="/app/messages">Message</Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-paper/80">No upcoming visit on the book.</p>
        )}
      </Card>
      {unpaid.length ? (
        <section>
          <h2 className="font-display text-xl text-navy">To pay</h2>
          <div className="mt-3 grid gap-2">
            {unpaid.map((i) => (
              <Card key={i.id} className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{i.description}</p>
                    <p className="tabular text-sm text-muted">{money(i.amount_cents)}</p>
                  </div>
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await payInvoiceAsClient({ data: { invoiceId: i.id, cardId: payCardId || undefined } });
                        if (res.ok) toast.success(`Paid. Receipt ${res.receiptNumber}`);
                        else toast.error(res.reason);
                        await qc.invalidateQueries({ queryKey: ["dashboard"] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Payment failed.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Pay now
                  </Button>
                </div>
                <CardSelect cards={data.cards} value={payCardId} onChange={setPayCardId} />
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <h2 className="font-display text-xl text-navy">Tip after a visit</h2>
        <div className="mt-3 grid gap-2">
          {past.slice(0, 3).map((j) => (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{formatDateTime(j.start_at)}</p>
                <p className="text-xs text-muted">{j.tip_cents ? `Tipped ${money(j.tip_cents)}` : "No tip yet"}</p>
              </div>
              <Dialog
                open={tipFor === j.id}
                onOpenChange={(o) => {
                  setTipFor(o ? j.id : null);
                  setTipConfirm(false);
                  setTipAmount("10.00");
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">Leave a tip</Button>
                </DialogTrigger>
                <DialogContent title={tipConfirm ? "Confirm tip" : "Leave a tip"}>
                  <div className="grid gap-3">
                    {tipConfirm ? (
                      <>
                        <p className="text-sm text-muted">
                          Charge {money(Math.round(Number(tipAmount) * 100) || 0)} to your default card?
                        </p>
                        <CardSelect cards={data.cards} value={tipCardId} onChange={setTipCardId} />
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => setTipConfirm(false)}>
                            Back
                          </Button>
                          <Button
                            onClick={async () => {
                              const amountCents = Math.round(Number(tipAmount) * 100);
                              if (!Number.isFinite(amountCents) || amountCents < 100) {
                                toast.error("Enter at least $1.00.");
                                return;
                              }
                              try {
                                const res = await tipJob({
                                  data: { jobId: j.id, amountCents, cardId: tipCardId || undefined },
                                });
                                if (res.ok) {
                                  toast.success(`Tip sent. Receipt ${res.receiptNumber}`);
                                  setTipFor(null);
                                  setTipConfirm(false);
                                  await qc.invalidateQueries({ queryKey: ["dashboard"] });
                                } else toast.error(res.reason);
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Tip failed.");
                              }
                            }}
                          >
                            Confirm {money(Math.round(Number(tipAmount) * 100) || 0)}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[500, 1000, 2000].map((amt) => (
                            <Button
                              key={amt}
                              variant="outline"
                              type="button"
                              onClick={() => setTipAmount((amt / 100).toFixed(2))}
                            >
                              {money(amt)}
                            </Button>
                          ))}
                        </div>
                        <Field label="Custom amount">
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            inputMode="decimal"
                          />
                        </Field>
                        <CardSelect cards={data.cards} value={tipCardId} onChange={setTipCardId} />
                        <Button
                          onClick={() => {
                            const amountCents = Math.round(Number(tipAmount) * 100);
                            if (!Number.isFinite(amountCents) || amountCents < 100) {
                              toast.error("Enter at least $1.00.");
                              return;
                            }
                            setTipConfirm(true);
                          }}
                        >
                          Continue
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
