import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { beginStripeCheckout, getSaasPlan, type SaasPlanCode } from "@/lib/sweepbook/plan";
import { cn } from "@/lib/utils";

type Search = { plan?: SaasPlanCode; checkout?: "canceled" };

export const Route = createFileRoute("/choose-plan")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: s.plan === "office" || s.plan === "crew" ? s.plan : undefined,
    checkout: s.checkout === "canceled" ? "canceled" : undefined,
  }),
  component: ChoosePlan,
});

const PLANS: { code: SaasPlanCode; name: string; price: string; points: string[] }[] = [
  {
    code: "crew",
    name: "Crew Plan",
    price: "$39/mo",
    points: ["Owner account", "Unlimited Team", "Unlimited Clients", "Admins are $19/mo each"],
  },
  {
    code: "office",
    name: "Office Plan",
    price: "$79/mo",
    points: ["Everything in the Crew Plan", "1 Admin included", "Team pay tracks what you owe cleaners"],
  },
];

function ChoosePlan() {
  const search = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [code, setCode] = useState<SaasPlanCode>(search.plan ?? "crew");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = PLANS.find((plan) => plan.code === code) ?? PLANS[0];
  const current = useQuery({
    queryKey: ["saas-plan", user?.id],
    queryFn: () => getSaasPlan(),
    enabled: Boolean(user),
  });

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const session = await beginStripeCheckout({ data: { code } });
      window.location.assign(session.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
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
                  <p className="mt-1 font-display text-4xl tabular">{plan.price}</p>
                  <ul className="mt-4 grid gap-1 text-sm">
                    {plan.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">Annual billing (2 months free) is not part of Checkout yet. Mark as Paid is available on the Crew Plan and the Office Plan.</p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              {user && current.data?.access === "master" && current.data.demo ? (
                <Button asChild>
                  <Link to="/app">Open the app</Link>
                </Button>
              ) : user ? (
                <Button type="button" disabled={busy} onClick={() => void checkout()}>
                  {busy ? "Opening Stripe…" : `Continue with ${selected.name}`}
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/signup" search={{ plan: code }}>
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
