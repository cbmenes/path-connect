import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, CalendarOff, CreditCard, MessageCircle, Smartphone, Wallet } from "lucide-react";
import {
  ImportPreview,
  MessagingPreview,
  PaymentsPreview,
  PortalPreview,
  SchedulingPreview,
  TeamPayPreview,
  TimeOffPreview,
} from "@/components/marketing/product-previews";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <SiteChrome>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">For cleaning business owners</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-navy md:text-6xl">
            Your crew. Your week. One place.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Calendar, clients, payments, and messages for cleaning business owners — without the chaos.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="lg" asChild>
              <Link to="/choose-plan">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/login?demo=cleaner">See demo</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">Crew $39/mo. Office $79/mo. Unlimited cleaners and client logins.</p>
        </div>
        <HeroPreview />
      </section>

      <section className="border-y border-border bg-paper/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          {[
            { k: "Invite-only", v: "No public cleaner search. You send the link." },
            { k: "Owner-ready", v: "Built around real weekly routes, not gig matching." },
            { k: "Cards, not chase", v: "Charge a saved card. Mark Venmo or cash as paid." },
            { k: "Works everywhere", v: "Phone, iPad, laptop — same website, same logins." },
          ].map((item) => (
            <div key={item.k}>
              <p className="font-display text-xl text-navy">{item.k}</p>
              <p className="mt-1 text-sm text-muted">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      <Feature
        id="scheduling"
        icon={CalendarCheck}
        kicker="Scheduling"
        title="One-off visits and a recurring route."
        body="Day and week views on a laptop. An agenda on your phone. Weekly, biweekly, and monthly jobs, with a warning if you double-book a cleaner."
        preview={<SchedulingPreview />}
      />
      <Feature
        id="payments"
        icon={CreditCard}
        kicker="Payments"
        title="A card on file. A receipt after."
        body="Clients add a card themselves, or you collect one on site through a secure form. Charge it for later visits. Request a tip. Mark a visit as paid when they Venmo, pay cash, or send a check."
        preview={<PaymentsPreview />}
        flip
      />
      <Feature
        id="portal"
        icon={MessageCircle}
        kicker="Client portal"
        title="A door for the people you already clean for."
        body="They see the next visit, message if you allow it, tip after a completed clean, and cancel. Inside 24 hours, your cancellation policy is right there."
        preview={<PortalPreview />}
      />
      <Feature
        id="switch"
        icon={Smartphone}
        kicker="Easy switch"
        title="Leave the group text without leaving your clients."
        body="Import a CSV of names, addresses, and usual days. Invite each household with a link. They keep you — they just stop paying through a chat thread."
        preview={<ImportPreview />}
        flip
      />
      <Feature
        id="messaging"
        icon={MessageCircle}
        kicker="Messaging"
        title="Threads that stay with the right people."
        body="The owner and a client have their own conversation. An admin who helps run the week cannot open those Master and client threads. The crew gets job notes and an on-my-way ping for the houses you already clean."
        preview={<MessagingPreview />}
      />
      <Feature
        id="pay"
        icon={Wallet}
        kicker="Team pay"
        title="Rates the crew never sees."
        body="You set each cleaner’s pay and see the week’s tally — hours or jobs, and what you owe. Their login shows the work, not the dollars."
        preview={<TeamPayPreview />}
        flip
      />
      <Feature
        id="time-off"
        icon={CalendarOff}
        kicker="Time off"
        title="Time off that blocks the calendar."
        body="A cleaner asks for days away. You approve it or leave it pending. Approved time sits on the calendar so you do not book them into a house they will not be at."
        preview={<TimeOffPreview />}
      />

      <Pricing />
    </SiteChrome>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const crewPrice = annual ? "$29" : "$39";
  const officePrice = annual ? "$69" : "$79";
  const crewNote = annual ? "billed annually ($348/year)" : "per month";
  const officeNote = annual ? "billed annually ($828/year)" : "per month";
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">Pricing</p>
        <h2 className="mt-2 font-display text-4xl text-navy">Crew or Office.</h2>
        <p className="mt-3 text-muted">
          Two paid tiers. Cleaners and clients are never billed as seats. {APP_NAME} is the owner’s book of houses and crew.
        </p>
      </div>
      <div className="mt-6 inline-flex rounded-md bg-secondary p-0.5 text-sm" role="group" aria-label="Billing period">
        <button
          type="button"
          className={annual ? "min-h-11 rounded px-3 text-muted" : "min-h-11 rounded bg-paper px-3 font-medium text-navy shadow-soft"}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
        <button
          type="button"
          className={annual ? "min-h-11 rounded bg-paper px-3 font-medium text-navy shadow-soft" : "min-h-11 rounded px-3 text-muted"}
          onClick={() => setAnnual(true)}
        >
          Annual · 2 months free
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="flex h-full flex-col rounded-2xl bg-paper p-6 shadow-card">
          <p className="text-sm font-medium text-navy">Crew</p>
          <p className="mt-2 font-display text-5xl tabular text-navy">
            {crewPrice}
            <span className="text-2xl text-muted">/mo</span>
          </p>
          <p className="mt-1 text-sm text-muted">{crewNote}</p>
          <ul className="mt-5 grid flex-1 gap-2 text-sm text-ink">
            <li>1 Master included</li>
            <li>Unlimited Team (cleaners)</li>
            <li>Unlimited Client logins</li>
            <li>Calendar, messages, time off, checklists, on-my-way / start / finish, booking form, CSV import</li>
            <li>No extra Admin seats on this tier (owner runs the book)</li>
          </ul>
        </article>
        <article className="flex h-full flex-col rounded-2xl bg-navy p-6 text-paper shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Office</p>
            <span className="rounded-full bg-sage-soft px-2 py-0.5 text-xs font-medium text-success">Recommended</span>
          </div>
          <p className="mt-2 font-display text-5xl tabular">
            {officePrice}
            <span className="text-2xl text-paper/70">/mo</span>
          </p>
          <p className="mt-1 text-sm text-paper/75">{officeNote}</p>
          <p className="mt-2 text-sm text-sage">Most shops with an office person</p>
          <ul className="mt-5 grid flex-1 gap-2 text-sm text-paper/90">
            <li>Everything in Crew</li>
            <li>1 extra Admin included</li>
            <li>Team pay / tallies (Master)</li>
            <li>Mark as Paid + notes</li>
            <li>Additional Admin seats: $19/mo each</li>
          </ul>
        </article>
      </div>
      <p className="mt-6 text-sm text-muted">
        Unlimited cleaners. Unlimited client logins. Extra office admins $19/mo on Office, not in Checkout.
      </p>
      <p className="mt-2 text-sm text-muted">
        The owner pays the software subscription. Client cards on file are separate.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to="/login">Log in</Link>
        </Button>
        <Button asChild>
          <Link to="/choose-plan">Get started</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href="/login?demo=cleaner">See demo</a>
        </Button>
      </div>
    </section>
  );
}

function Feature({
  id,
  icon: Icon,
  kicker,
  title,
  body,
  preview,
  flip,
}: {
  id: string;
  icon: typeof CalendarCheck;
  kicker: string;
  title: string;
  body: string;
  preview: ReactNode;
  flip?: boolean;
}) {
  return (
    <section id={id} className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
      <div className={flip ? "md:order-2" : ""}>
        <div className="flex items-center gap-2 text-sage">
          <Icon className="size-4" />
          <p className="text-xs font-medium uppercase tracking-[0.18em]">{kicker}</p>
        </div>
        <h2 className="mt-2 font-display text-3xl text-navy md:text-4xl">{title}</h2>
        <p className="mt-3 max-w-xl text-muted">{body}</p>
      </div>
      <div className={flip ? "md:order-1" : ""}>{preview}</div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-2xl bg-navy p-3 shadow-card md:p-4">
      <div className="rounded-xl bg-bg p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-navy">Wednesday route</p>
          <span className="rounded-full bg-sage-soft px-2 py-0.5 text-xs text-success">3 visits</span>
        </div>
        <ul className="mt-4 grid gap-3">
          {[
            ["11:00", "Cam Delgado", "Bricktown loft", "$140"],
            ["1:00", "Jordan Ellis", "Midtown bungalow", "$160"],
            ["4:00", "Buffer / travel", "North on I-235", "—"],
          ].map(([t, n, a, p]) => (
            <li key={n} className="flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft">
              <div>
                <p className="text-sm font-medium text-ink">{n}</p>
                <p className="text-xs text-muted">
                  {t} · {a}
                </p>
              </div>
              <p className="tabular text-sm text-navy">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
