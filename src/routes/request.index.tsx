import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/request/")({ component: RequestNeedsSlug });

function RequestNeedsSlug() {
  return (
    <SiteChrome>
      <div className="mx-auto max-w-lg px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage">Booking form</p>
        <h1 className="mt-2 font-display text-4xl text-navy">Link incomplete</h1>
        <p className="mt-3 text-muted">
          This public booking form is unique to each company. Open a link that includes the business name, for example
          /request/brooks-clean-co.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </SiteChrome>
  );
}
