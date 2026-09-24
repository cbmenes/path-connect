import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Privacy</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} stores the information you and your clients enter: names, addresses, access notes, visit times,
            messages, and payment records.
          </p>
          <p>
            Card numbers are never stored. We keep brand and last four digits only, enough to show “Visa · 4242” on a
            receipt. Charges in this product run in test mode.
          </p>
          <p>
            Client records belong to the cleaner who created them. Clients see only their own visits, messages, and
            receipts. We do not sell data, and we do not list cleaners in a public directory.
          </p>
          <p>Questions: {SUPPORT_EMAIL}, or use the contact page.</p>
        </div>
      </article>
    </SiteChrome>
  );
}
