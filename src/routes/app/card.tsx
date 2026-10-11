import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/lib/sweepbook/dashboard";
import { listCardsForClient } from "@/lib/sweepbook/payments";
import { CardManager } from "@/components/app/card-manager";
import { PageHeader } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/card")({ component: CardPage });

function CardPage() {
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const clientId = dash.data?.actor.kind === "client" ? dash.data.actor.client.id : "";
  const cards = useQuery({
    queryKey: ["cards", clientId],
    queryFn: () => listCardsForClient({ data: clientId }),
    enabled: Boolean(clientId),
  });
  const qc = useQueryClient();

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <PageHeader title="Your card" />
      <p className="text-sm text-muted">
        Demo companies keep brand and last four on file. A connected company collects the card in Stripe and shows the brand and last four here.
      </p>
      {clientId ? (
        <CardManager
          clientId={clientId}
          cards={cards.data ?? []}
          source="client"
          onChange={async () => {
            await qc.invalidateQueries({ queryKey: ["cards"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      ) : null}
    </div>
  );
}
