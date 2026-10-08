import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Terms</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} is a tool for a cleaning business owner, their crew, and the households they invite. You are responsible for the
            work you schedule, the prices you charge, and the cancellation policy you publish to clients.
          </p>
          <p>
            Demo accounts are for evaluation. The Crew Plan is $39 per month and the Office Plan is $79 per month. Annual billing is two months free: Crew Plan $348 per year, Office Plan $828 per year. Extra office admins are $19 per month on the Office Plan. Cleaners and clients are not billed. Clients do not pay {APP_NAME}.
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
