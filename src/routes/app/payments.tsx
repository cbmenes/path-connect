import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listInvoices, markAsPaid } from "@/lib/sweepbook/payments";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  chicagoDayKey,
  endOfChicagoMonth,
  money,
  startOfChicagoMonth,
  startOfChicagoYear,
} from "@/lib/sweepbook/time";
import type { InvoiceWithClient } from "@/lib/sweepbook/types";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { ReceiptBody, VisitChargeLine } from "@/components/app/receipt";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/payments")({ component: PaymentsPage });

function monthDefaults() {
  const now = new Date();
  return { from: chicagoDayKey(startOfChicagoMonth(now)), to: chicagoDayKey(endOfChicagoMonth(now)) };
}

function inRange(iso: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!iso) return false;
  const day = chicagoDayKey(iso);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function filterDate(row: InvoiceWithClient) {
  if (row.kind === "tip") return row.paid_at || row.created_at;
  if (row.status === "paid") return row.paid_at || row.job_start_at || row.created_at;
  return row.job_start_at || row.created_at;
}

function cents(n: number | string | null | undefined) {
  return Number(n || 0);
}

function tipCentsFor(row: InvoiceWithClient, rows: InvoiceWithClient[]) {
  if (row.kind === "tip") return cents(row.amount_cents);
  if (!row.job_id) return 0;
  return rows
    .filter((r) => r.kind === "tip" && r.job_id === row.job_id && r.status === "paid")
    .reduce((n, r) => n + cents(r.amount_cents), 0);
}

function useDateRange() {
  const defaults = useMemo(() => monthDefaults(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  return { from, to, setFrom, setTo };
}

function DateRangeBar({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="From">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </Field>
      <Field label="To">
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2 pb-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const d = monthDefaults();
            setFrom(d.from);
            setTo(d.to);
          }}
        >
          This month
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            setFrom(chicagoDayKey(startOfChicagoYear(now)));
            setTo(chicagoDayKey(now));
          }}
        >
          YTD
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() });
  const qc = useQueryClient();
  const rows = q.data ?? [];
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [markTarget, setMarkTarget] = useState<InvoiceWithClient | null>(null);
  const [markNote, setMarkNote] = useState("");
  const [marking, setMarking] = useState(false);
  const receipt = rows.find((r) => r.id === receiptId) ?? null;

  const unpaidRange = useDateRange();
  const paidRange = useDateRange();
  const tipsRange = useDateRange();
  const totalsRange = useDateRange();

  const unpaidAll = rows.filter((r) => r.kind !== "tip" && (r.status === "unpaid" || r.status === "failed"));
  const paidAll = rows.filter((r) => r.kind !== "tip" && r.status === "paid");
  const tipsAll = rows.filter((r) => r.kind === "tip");

  const unpaid = unpaidAll.filter((r) => inRange(filterDate(r), unpaidRange.from, unpaidRange.to));
  const paid = paidAll.filter((r) => inRange(filterDate(r), paidRange.from, paidRange.to));
  const tips = tipsAll.filter((r) => inRange(filterDate(r), tipsRange.from, tipsRange.to));
  const totalsRows = rows.filter((r) => inRange(filterDate(r), totalsRange.from, totalsRange.to));

  const unpaidTotal = unpaid.reduce((n, r) => n + cents(r.amount_cents), 0);
  const paidTotal = paid.reduce((n, r) => n + cents(r.amount_cents), 0);
  const tipsTotal = tips.reduce((n, r) => n + cents(r.amount_cents), 0);
  const totalsUnpaid = totalsRows
    .filter((r) => r.kind !== "tip" && (r.status === "unpaid" || r.status === "failed"))
    .reduce((n, r) => n + cents(r.amount_cents), 0);
  const totalsPaid = totalsRows
    .filter((r) => r.kind !== "tip" && r.status === "paid")
    .reduce((n, r) => n + cents(r.amount_cents), 0);
  const totalsTips = totalsRows.filter((r) => r.kind === "tip").reduce((n, r) => n + cents(r.amount_cents), 0);

  if (actor.data?.kind === "client") {
    return <Navigate to="/app/receipts" />;
  }
  const isMaster = actor.data?.kind === "cleaner";
  const canCharge = actor.data?.kind === "cleaner" || (actor.data?.kind === "admin" && actor.data.canCharge);
  if (actor.data?.kind === "team") {
    return <p className="text-muted">Payments are only visible to the office.</p>;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        action={
          isMaster ? (
            <Button variant="outline" asChild>
              <Link to="/app/team-pay">Team pay</Link>
            </Button>
          ) : null
        }
      />
      <Card className="grid gap-3">
        <h2 className="font-display text-xl text-navy">Totals</h2>
        <DateRangeBar {...totalsRange} />
        <p className="text-sm text-muted">
          Unpaid {money(totalsUnpaid)} · Paid {money(totalsPaid)} · Tips {money(totalsTips)}
        </p>
      </Card>

      <PaymentSection
        title="Unpaid"
        total={unpaidTotal}
        empty="No unpaid invoices in this range."
        rows={unpaid}
        range={unpaidRange}
        tipFor={(row) => tipCentsFor(row, rows)}
        onReceipt={setReceiptId}
        onMark={
          canCharge
            ? (row) => {
                setMarkNote("");
                setMarkTarget(row);
              }
            : undefined
        }
      />
      <PaymentSection
        title="Paid"
        total={paidTotal}
        empty="No paid visits in this range."
        rows={paid}
        range={paidRange}
        tipFor={(row) => tipCentsFor(row, rows)}
        onReceipt={setReceiptId}
      />
      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-navy">Tips</h2>
          <p className="tabular text-sm text-muted">{money(tipsTotal)}</p>
        </div>
        <DateRangeBar {...tipsRange} />
        {tips.length === 0 ? (
          <p className="text-sm text-muted">No tips in this range.</p>
        ) : (
          tips.map((i) => (
            <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{i.client_name}</p>
                <VisitChargeLine
                  jobStart={i.job_start_at}
                  status={i.status}
                  paidAt={i.paid_at}
                  method={i.method}
                  note={i.paid_note}
                  tipCents={cents(i.amount_cents)}
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="tabular font-medium">{money(cents(i.amount_cents))}</p>
                <Button variant="outline" size="sm" onClick={() => setReceiptId(i.id)}>
                  Receipt
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      <ConfirmDialog
        open={Boolean(markTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setMarkTarget(null);
            setMarkNote("");
          }
        }}
        title="Mark this appointment as paid without charging a card?"
        body={
          markTarget
            ? `${markTarget.client_name} · ${money(cents(markTarget.amount_cents))}. No card is charged.`
            : ""
        }
        cancelLabel="Cancel"
        confirmLabel="Mark as Paid"
        busyLabel="Saving…"
        confirmVariant="primary"
        busy={marking}
        onConfirm={async () => {
          if (!markTarget) return;
          setMarking(true);
          try {
            const res = await markAsPaid({
              data: {
                invoiceId: markTarget.id,
                note: markNote.trim() || null,
              },
            });
            toast.success(`Marked as paid. Receipt ${res.receiptNumber}`);
            setMarkTarget(null);
            setMarkNote("");
            await qc.invalidateQueries({ queryKey: ["invoices"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
            await qc.invalidateQueries({ queryKey: ["jobs"] });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not mark paid.");
          } finally {
            setMarking(false);
          }
        }}
      >
        <Field label="How they paid" hint="Optional — Venmo, cash, Zelle, check, etc.">
          <Input
            value={markNote}
            maxLength={120}
            placeholder="Venmo, cash, Zelle, check…"
            onChange={(e) => setMarkNote(e.target.value)}
          />
        </Field>
      </ConfirmDialog>

      <Dialog open={Boolean(receipt)} onOpenChange={(o) => !o && setReceiptId(null)}>
        {receipt ? (
          <DialogContent title="Receipt">
            <ReceiptBody
              number={receipt.receipt_number}
              description={receipt.description}
              amount={cents(receipt.amount_cents)}
              method={receipt.method}
              paidAt={receipt.paid_at}
              client={receipt.client_name}
              note={receipt.paid_note}
              jobStart={receipt.job_start_at}
              status={receipt.status}
              tipCents={tipCentsFor(receipt, rows)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function PaymentSection({
  title,
  total,
  empty,
  rows,
  range,
  tipFor,
  onReceipt,
  onMark,
}: {
  title: string;
  total: number;
  empty: string;
  rows: InvoiceWithClient[];
  range: ReturnType<typeof useDateRange>;
  tipFor: (row: InvoiceWithClient) => number;
  onReceipt: (id: string) => void;
  onMark?: (row: InvoiceWithClient) => void;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-navy">{title}</h2>
        <p className="tabular text-sm text-muted">{money(total)}</p>
      </div>
      <DateRangeBar {...range} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        rows.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{i.client_name}</p>
              <p className="text-xs text-muted">{i.description}</p>
              <VisitChargeLine
                jobStart={i.job_start_at}
                status={i.status}
                paidAt={i.paid_at}
                method={i.method}
                note={i.paid_note}
                tipCents={i.status === "paid" ? tipFor(i) : 0}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="tabular">{money(cents(i.amount_cents))}</p>
                <InvoiceStatusBadge status={i.status} />
              </div>
              {i.status === "paid" ? (
                <Button variant="outline" size="sm" onClick={() => onReceipt(i.id)}>
                  Receipt
                </Button>
              ) : null}
              {onMark && i.status !== "paid" ? (
                <Button variant="outline" size="sm" onClick={() => onMark(i)}>
                  Mark as Paid
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/clients/$id" params={{ id: i.client_id }}>
                  Client
                </Link>
              </Button>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}
