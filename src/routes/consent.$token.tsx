import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SmsConsentForm } from "@/components/app/sms-opt-in";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";
import { getSmsConsentPage, submitSmsConsent } from "@/lib/sweepbook/sms-consent-link";

export const Route = createFileRoute("/consent/$token")({
  head: () => ({ meta: [{ title: `SMS consent · ${APP_NAME}` }] }),
  component: ClientSmsConsent,
});

function ClientSmsConsent() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const page = useQuery({
    queryKey: ["sms-consent", token],
    queryFn: () => getSmsConsentPage({ data: token }),
  });
  const [busy, setBusy] = useState(false);
  const data = page.data;

  return (
    <SiteChrome>
      <div className="mx-auto max-w-md px-4 py-14">
        {page.isError ? (
          <p className="text-danger">{(page.error as Error).message}</p>
        ) : data ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">SMS consent</p>
            <h1 className="mt-2 font-display text-3xl text-navy">{data.companyName}</h1>
            {data.status === "confirmed" ? (
              <div className="mt-6 rounded-xl bg-paper p-5 shadow-card">
                <p className="text-sm text-ink">{data.clientName}</p>
                <p className="mt-2 text-sm text-ink">
                  <span className="text-muted">Phone number on file: </span>
                  {data.phone}
                </p>
                <p className="mt-4 text-sm text-success">
                  You are opted in to text messages from {data.companyName}.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-paper p-5 shadow-card">
                {data.status === "opted_out" ? (
                  <p className="mb-4 text-sm text-muted">
                    You previously opted out. Check the box and submit to opt in again.
                  </p>
                ) : null}
                {!data.hasPhone ? (
                  <p className="mb-4 text-sm text-danger">
                    There is no phone number on file. Ask {data.companyName} to add one, then open this link again.
                  </p>
                ) : null}
                <SmsConsentForm
                  companyName={data.companyName}
                  clientName={data.clientName}
                  phone={data.phone}
                  submitting={busy}
                  onSubmit={async (agreed) => {
                    if (!agreed) {
                      toast.error("Check the box to opt in.");
                      return;
                    }
                    setBusy(true);
                    try {
                      await submitSmsConsent({ data: { token, agreed: true } });
                      toast.success("You are opted in.");
                      await qc.invalidateQueries({ queryKey: ["sms-consent", token] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not save consent.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        )}
      </div>
    </SiteChrome>
  );
}
