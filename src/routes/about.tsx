import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_HOST_NAME, APP_NAME, HELLO_EMAIL, PUBLIC_SITE_HOST, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">About</p>
        <h1 className="mt-2 font-display text-4xl text-navy">A book for the route you already have.</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} is the owner’s book of houses and crew. It is a website first — usable on a phone in a
            driveway and on a laptop at the kitchen table. The public site is {PUBLIC_SITE_HOST}. The app lives at{" "}
            {APP_HOST_NAME}.
          </p>
          <p>
            An owner keeps the households they already clean, invites the crew, and runs the calendar, notes,
            messages, and payments in one place.
          </p>
          <p>
            Maya Brooks in Oklahoma City is the kind of owner we had in mind: a Tuesday Nichols Hills house, a
            Wednesday Bricktown loft, a Friday Edmond kitchen, and a week that used to live in a group text.
          </p>
          <p>
            Hello at {HELLO_EMAIL}. Support at {SUPPORT_EMAIL}.
          </p>
        </div>
      </article>
    </SiteChrome>
  );
}
