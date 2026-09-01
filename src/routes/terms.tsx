import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Terms</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            SweepBook is a tool for an independent cleaner and the households they invite. You are responsible for the
            work you schedule, the prices you charge, and the cancellation policy you publish to clients.
          </p>
          <p>
            Demo accounts are for evaluation. Paid plans are $19 per month for a cleaner. Clients do not pay SweepBook.
          </p>
          <p>
            Payment features currently run in test mode so you can practice charging, tipping, and recording cash or
            Venmo. Do not enter a live card you are not willing to use in a demonstration.
          </p>
        </div>
      </article>
    </SiteChrome>
  );
}
