import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EmbeddedCheckoutForm } from "@/components/app/embedded-checkout";
import { beginStripeCheckout, getSaasPlan, type BillingInterval, type SaasPlanCode } from "@/lib/sweepbook/plan";
import { cn } from "@/lib/utils";

type Search = { plan?: SaasPlanCode; checkout?: "canceled" };

export const Route = createFileRoute("/choose-plan")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: s.plan === "office" || s.plan === "crew" ? s.plan : undefined,
    checkout: s.checkout === "canceled" ? "canceled" : undefined,
  }),
  component: ChoosePlan,
});

const PLANS: { code: SaasPlanCode; name: string; month: string; year: string; points: string[] }[] = [
  {
    code: "crew",
    name: "Crew Plan",
    month: "$39/mo",
    year: "$390/year",
    points: ["Owner account", "Unlimited Team", "Unlimited Clients", "Admins are $19/mo or $190/year"],
  },
  {
    code: "office",
    name: "Office Plan",
    month: "$79/mo",
    year: "$790/year",
    points: ["Everything in the Crew Plan", "1 Admin included", "Team pay tracks what you owe cleaners"],
  },
];

function ChoosePlan() {
  const search = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [code, setCode] = useState<SaasPlanCode>(search.plan ?? "crew");
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const selected = PLANS.find((plan) => plan.code === code) ?? PLANS[0];
  const current = useQuery({
    queryKey: ["saas-plan", user?.id],
    queryFn: () => getSaasPlan(),
    enabled: Boolean(user),
  });

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const session = await beginStripeCheckout({ data: { code, interval } });
      setCheckout(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-12">
        <div>
          <CrewWeekLogo />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-sage">Choose plan</p>
          <h1 className="mt-2 font-display text-4xl text-navy">Crew Plan or Office Plan</h1>
          <p className="mt-2 text-sm text-muted">
            The business owner pays monthly. Cleaners and clients are not billed. Extra Admin is $19/mo and is not part of Checkout.
          </p>
        </div>

        {search.checkout === "canceled" ? (
          <p className="rounded-xl bg-paper px-4 py-3 text-sm text-ink shadow-card">
            Checkout was canceled. Pick a plan and continue when you are ready.
          </p>
        ) : null}

        {isPending ? <div className="h-32 animate-pulse rounded-xl bg-secondary" /> : null}

        {!isPending ? (
          <>
            <div className="inline-flex rounded-md bg-secondary p-0.5 text-sm" role="group" aria-label="Billing interval">
              <button
                type="button"
                className={interval === "month" ? "min-h-11 rounded bg-paper px-3 font-medium text-navy shadow-soft" : "min-h-11 rounded px-3 text-muted"}
                onClick={() => setInterval("month")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={interval === "year" ? "min-h-11 rounded bg-paper px-3 font-medium text-navy shadow-soft" : "min-h-11 rounded px-3 text-muted"}
                onClick={() => setInterval("year")}
              >
                Annual · 2 months free
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PLANS.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setCode(plan.code)}
                  className={cn(
                    "rounded-2xl p-5 text-left shadow-card",
                    code === plan.code ? "bg-navy text-paper" : "bg-paper text-ink",
                  )}
                >
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="mt-1 font-display text-4xl tabular">{interval === "year" ? plan.year : plan.month}</p>
                  <ul className="mt-4 grid gap-1 text-sm">
                    {plan.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">
              Annual billing is two months free: Crew Plan $390/year, Office Plan $790/year. Mark as Paid is available on the Crew Plan and the Office Plan.
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {checkout ? (
              <div className="rounded-xl bg-paper p-5 shadow-card">
                <EmbeddedCheckoutForm clientSecret={checkout.clientSecret} publishableKey={checkout.publishableKey} />
                <Button variant="ghost" className="mt-2" onClick={() => setCheckout(null)}>
                  Choose a different plan
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {user && current.data?.access === "master" && current.data.demo ? (
                <Button asChild>
                  <Link to="/app">Open the app</Link>
                </Button>
              ) : user ? (
                <Button type="button" disabled={busy || Boolean(checkout)} onClick={() => void startCheckout()}>
                  {busy ? "Opening the payment form…" : `Continue with ${selected.name}`}
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/signup" search={{ plan: code, interval }}>
                    Continue with {selected.name}
                  </Link>
                </Button>
              )}
            </div>
            {current.data?.access === "master" && current.data.demo ? (
              <p className="text-sm text-muted">Demo accounts stay signed in without a subscription.</p>
            ) : null}
            {current.data?.access === "master" && !current.data.demo && current.data.status === "active" ? (
              <p className="text-sm text-muted">
                This account is already on the {current.data.code === "office" ? "Office Plan" : "Crew Plan"}.{" "}
                <Link to="/app" className="text-navy underline-offset-4 hover:underline">
                  Open the app
                </Link>
              </p>
            ) : null}
            {user && current.data && current.data.access !== "master" ? (
              <p className="text-sm text-muted">The Crew Plan and the Office Plan are paid by the business owner.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </SiteChrome>
  );
}
