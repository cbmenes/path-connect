import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getCardLinkPublic } from "@/lib/sweepbook/invites";
import { addCardByToken } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import { CardForm } from "@/components/app/card-form";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/add-card/$token")({ component: AddCardLink });

function AddCardLink() {
  const { token } = Route.useParams();
  const link = useQuery({ queryKey: ["card-link", token], queryFn: () => getCardLinkPublic({ data: token }) });
  const [done, setDone] = useState<{ brand: string; last4: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <SiteChrome>
      <div className="mx-auto max-w-md px-4 py-14">
        {link.isError ? (
          <p className="text-danger">{(link.error as Error).message}</p>
        ) : link.data ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">Secure card form</p>
            <h1 className="mt-2 font-display text-3xl text-navy">
              Add a card for {link.data.business_name || link.data.cleaner_name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              For {link.data.client_name}. {APP_NAME} never keeps the full card number — only the brand and last four.
            </p>
            {done ? (
              <p className="mt-6 rounded-xl bg-sage-soft p-5 text-success">
                Saved {brandLabel(done.brand)} · {done.last4}. You can close this page.
              </p>
            ) : (
              <div className="mt-6 rounded-xl bg-paper p-5 shadow-card">
                <CardForm
                  submitting={busy}
                  submitLabel="Save card securely"
                  onSubmit={async (payload) => {
                    setBusy(true);
                    try {
                      const saved = await addCardByToken({
                        data: { ...payload, token, source: "client" },
                      });
                      setDone({ brand: saved.brand, last4: saved.last4 });
                      toast.success("Card saved.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not save the card.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        )}
      </div>
    </SiteChrome>
  );
}
