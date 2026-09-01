import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listInvoices, recordOutsidePayment } from "@/lib/sweepbook/payments";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { formatDate, money } from "@/lib/sweepbook/time";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { ReceiptBody } from "@/components/app/receipt";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/input";

export const Route = createFileRoute("/app/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() });
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const rows = q.data ?? [];
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const receipt = rows.find((r) => r.id === receiptId) ?? null;
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  if (actor.data?.kind === "client") {
    return <Navigate to="/app/receipts" />;
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="Payments" />
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect className="max-w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </NativeSelect>
        <p className="text-sm text-muted">
          Outstanding {money(rows.filter((r) => r.status === "unpaid" || r.status === "failed").reduce((n, r) => n + r.amount_cents, 0))}
        </p>
      </div>
      <div className="grid gap-2">
        {filtered.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{i.client_name}</p>
              <p className="text-xs text-muted">
                {i.description} · {formatDate(i.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="tabular">{money(i.amount_cents)}</p>
                <InvoiceStatusBadge status={i.status} />
              </div>
              {i.status === "paid" ? (
                <Button variant="outline" size="sm" onClick={() => setReceiptId(i.id)}>
                  Receipt
                </Button>
              ) : null}
              {i.status !== "paid" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await recordOutsidePayment({
                      data: {
                        invoiceId: i.id,
                        clientId: i.client_id,
                        amountCents: i.amount_cents,
                        description: i.description,
                        method: "outside",
                      },
                    });
                    toast.success(`Marked paid. Receipt ${res.receiptNumber}`);
                    await qc.invalidateQueries({ queryKey: ["invoices"] });
                  }}
                >
                  Mark paid outside
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/clients/$id" params={{ id: i.client_id }}>
                  Client
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={Boolean(receipt)} onOpenChange={(o) => !o && setReceiptId(null)}>
        {receipt ? (
          <DialogContent title="Receipt">
            <ReceiptBody
              number={receipt.receipt_number}
              description={receipt.description}
              amount={receipt.amount_cents}
              method={receipt.method}
              paidAt={receipt.paid_at}
              client={receipt.client_name}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
