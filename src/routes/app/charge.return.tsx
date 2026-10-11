import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { confirmClientCharge } from "@/lib/sweepbook/payments";
import { money } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/charge/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string; canceled?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    canceled: s.canceled === "1" || s.canceled === 1 || s.canceled === "true" || s.canceled === true ? "1" : undefined,
  }),
  component: ChargeReturn,
});

function ChargeReturn() {
  const { session_id: sessionId, canceled } = Route.useSearch();
  const confirming = Boolean(sessionId) && canceled !== "1";
  const confirmed = useQuery({
    queryKey: ["client-charge", sessionId],
    queryFn: () => confirmClientCharge({ data: { sessionId: sessionId || "" } }),
    enabled: confirming,
    retry: false,
  });

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <h1 className="font-display text-3xl text-navy">Card charge</h1>
      {canceled === "1" ? (
        <Card>
          <p className="font-medium text-ink">The charge was canceled.</p>
          <p className="mt-2 text-sm text-muted">The visit was not marked paid.</p>
        </Card>
      ) : !confirming ? (
        <Card>
          <p className="text-sm text-muted">Stripe has not confirmed this charge. The visit was not marked paid.</p>
        </Card>
      ) : confirmed.isPending ? (
        <div className="h-28 animate-pulse rounded-xl bg-secondary" />
      ) : confirmed.isError ? (
        <Card>
          <p className="text-sm text-danger">{(confirmed.error as Error).message}</p>
          <p className="mt-2 text-sm text-muted">The visit stays unpaid until Stripe confirms the charge.</p>
        </Card>
      ) : confirmed.data?.paid ? (
        <Card>
          <p className="font-display text-2xl text-navy">Paid</p>
          <p className="mt-2 text-sm text-ink">
            Receipt {confirmed.data.receiptNumber}. {money(confirmed.data.amountCents)}
            {confirmed.data.last4 ? ` · ${confirmed.data.brand} · ${confirmed.data.last4}` : ""}.
          </p>
          <p className="mt-2 text-sm text-muted">Stripe confirmed this charge on the cleaning company's account.</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">Stripe has not confirmed this charge. The visit was not marked paid.</p>
        </Card>
      )}
      <Button variant="outline" asChild>
        <Link to="/app">Back to home</Link>
      </Button>
    </div>
  );
}
