import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">About</p>
        <h1 className="mt-2 font-display text-4xl text-navy">A book for the route you already have.</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            SweepBook is software for independent house cleaners. It is a website first — usable on a phone in a
            driveway and on a laptop at the kitchen table.
          </p>
          <p>
            We do not match strangers. We do not run a marketplace. A cleaner owns an account, invites the households
            they already work with, and keeps scheduling, notes, messages, and payments in one place.
          </p>
          <p>
            The name is literal. Sweep, then book it. Maya Brooks in Oklahoma City is the kind of cleaner we had in
            mind: a Tuesday Nichols Hills house, a Wednesday Bricktown loft, a Friday Edmond kitchen, and a Venmo
            thread that had gone on too long.
          </p>
        </div>
      </article>
    </SiteChrome>
  );
}
