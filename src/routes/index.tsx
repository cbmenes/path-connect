import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, CreditCard, MessageCircle, Smartphone } from "lucide-react";
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
              <Link to="/signup">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/login?demo=cleaner">See demo</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">$19/month for the cleaner. Clients are free.</p>
        </div>
        <HeroPreview />
      </section>

      <section className="border-y border-border bg-paper/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          {[
            { k: "Invite-only", v: "No public cleaner search. You send the link." },
            { k: "Oklahoma-ready", v: "Built around real weekly routes, not gig matching." },
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
        body="Day and week views on a laptop. An agenda on your phone. Weekly, biweekly, and monthly jobs, with a warning if you double-book yourself."
      />
      <Feature
        id="payments"
        icon={CreditCard}
        kicker="Payments"
        title="A card on file. A receipt after."
        body="Clients add a card themselves, or you collect one on site through a secure form. Charge it for later visits. Request a tip. Mark a visit as paid when they Venmo, pay cash, or send a check."
        flip
      />
      <Feature
        id="portal"
        icon={MessageCircle}
        kicker="Client portal"
        title="A door for the people you already clean for."
        body="They see the next visit, message you, tip after a completed clean, and cancel or reschedule. Inside 24 hours, your cancellation policy is right there."
      />
      <Feature
        id="switch"
        icon={Smartphone}
        kicker="Easy switch"
        title="Leave the group text without leaving your clients."
        body="Import a CSV of names, addresses, and usual days. Invite each household with a link. They keep you — they just stop paying through a chat thread."
      />

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-2xl bg-navy px-6 py-10 text-paper md:grid-cols-[1.2fr_0.8fr] md:px-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">Pricing</p>
            <h2 className="mt-2 font-display text-4xl">One plan. Nineteen a month.</h2>
            <p className="mt-3 max-w-lg text-paper/75">
              {APP_NAME} is the owner’s book of houses and crew. Unlimited clients, visits, messages, and cards.
              Your clients never pay us.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-paper/85">
              <li>Calendar, client records, and messaging</li>
              <li>Secure cards, invoices, tips, and receipts</li>
              <li>CSV import and invite links</li>
            </ul>
          </div>
          <div className="rounded-xl bg-paper p-6 text-ink">
            <p className="text-sm text-muted">Cleaner account</p>
            <p className="mt-1 font-display text-5xl tabular-nums text-navy">
              $19<span className="text-2xl text-muted">/mo</span>
            </p>
            <p className="mt-2 text-sm text-muted">Clients · Free</p>
            <Button className="mt-6 w-full" asChild>
              <Link to="/signup">Start with your own clients</Link>
            </Button>
            <Button className="mt-2 w-full" variant="outline" asChild>
              <a href="/login?demo=cleaner">Open the demo</a>
            </Button>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}

function Feature({
  id,
  icon: Icon,
  kicker,
  title,
  body,
  flip,
}: {
  id: string;
  icon: typeof CalendarCheck;
  kicker: string;
  title: string;
  body: string;
  flip?: boolean;
}) {
  return (
    <section id={id} className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
      <div className={flip ? "md:order-2" : ""}>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">{kicker}</p>
        <h2 className="mt-2 font-display text-3xl text-navy md:text-4xl">{title}</h2>
        <p className="mt-3 text-muted">{body}</p>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <div className="rounded-2xl bg-navy p-4 shadow-card">
          <div className="rounded-xl bg-paper p-4">
            <div className="mb-3 flex items-center gap-2 text-navy">
              <Icon className="size-4" />
              <span className="text-sm font-medium">{kicker}</span>
            </div>
            <div className="grid gap-2">
              <div className="h-2.5 w-2/3 rounded-full bg-secondary" />
              <div className="h-2.5 w-full rounded-full bg-sage-soft" />
              <div className="h-2.5 w-5/6 rounded-full bg-secondary" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="h-16 rounded-lg bg-sage-soft" />
                <div className="h-16 rounded-lg bg-navy/10" />
                <div className="h-16 rounded-lg bg-secondary" />
              </div>
            </div>
          </div>
        </div>
      </div>
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
