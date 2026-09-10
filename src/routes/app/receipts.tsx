import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listInvoices } from "@/lib/sweepbook/payments";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { formatDate, money } from "@/lib/sweepbook/time";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { ReceiptBody } from "@/components/app/receipt";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/receipts")({ component: ReceiptsPage });

function ReceiptsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() });
  const [open, setOpen] = useState<string | null>(null);
  const rows = q.data ?? [];
  const current = rows.find((r) => r.id === open);

  if (actor.data?.kind === "cleaner") {
    return <Navigate to="/app/payments" />;
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="Receipts" />
      <div className="grid gap-2">
        {rows.map((i) => (
          <Card key={i.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{i.description}</p>
              <p className="text-xs text-muted">
                {formatDate(i.created_at)} · {i.receipt_number || "No receipt yet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="tabular text-sm">{money(i.amount_cents)}</p>
                <InvoiceStatusBadge status={i.status} />
              </div>
              {i.status === "paid" ? (
                <Button variant="outline" size="sm" onClick={() => setOpen(i.id)}>
                  View
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={Boolean(current)} onOpenChange={(o) => !o && setOpen(null)}>
        {current ? (
          <DialogContent title="Receipt">
            <ReceiptBody
              number={current.receipt_number}
              description={current.description}
              amount={current.amount_cents}
              method={current.method}
              paidAt={current.paid_at}
              client={current.client_name}
              note={current.paid_note}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
