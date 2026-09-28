import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { startSaasPlan, type SaasPlanCode } from "@/lib/sweepbook/plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/choose-plan")({ component: ChoosePlan });

const PLANS: { code: SaasPlanCode; name: string; price: string; points: string[] }[] = [
  {
    code: "crew",
    name: "Crew",
    price: "$39/mo",
    points: ["1 Master", "Unlimited Team", "Unlimited Clients", "No extra Admin"],
  },
  {
    code: "office",
    name: "Office",
    price: "$79/mo",
    points: ["Everything in Crew", "1 extra Admin included", "Team pay / Mark as Paid", "Extra Admin $19/mo as a line item"],
  },
];

function ChoosePlan() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState<SaasPlanCode>("crew");
  const [step, setStep] = useState<"choose" | "review">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = PLANS.find((plan) => plan.code === code) ?? PLANS[0];

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await startSaasPlan({ data: { code } });
      await qc.invalidateQueries({ queryKey: ["actor"] });
      toast.success(`${selected.name} plan started`);
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-12">
        <div>
          <CrewWeekLogo />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-sage">
            {step === "choose" ? "Choose plan" : "Review + confirm"}
          </p>
          <h1 className="mt-2 font-display text-4xl text-navy">{step === "choose" ? "Choose a plan" : `Review ${selected.name}`}</h1>
          <p className="mt-2 text-sm text-muted">Annual is 2 months free later. This demo is monthly. Nothing is charged.</p>
        </div>

        {isPending ? <div className="h-32 animate-pulse rounded-xl bg-secondary" /> : null}
        {!isPending && !user ? (
          <div className="rounded-xl bg-paper p-5 shadow-card">
            <p className="text-sm text-muted">Create an account first, then choose Crew or Office.</p>
            <Button className="mt-4" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        ) : null}

        {!isPending && user && step === "choose" ? (
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
            <p className="text-sm text-muted">Extra Admin is $19/mo on Office only. It is a line item, not a seat you can buy here.</p>
            <div>
              <Button type="button" onClick={() => setStep("review")}>
                Review {selected.name}
              </Button>
            </div>
          </>
        ) : null}

        {!isPending && user && step === "review" ? (
          <div className="grid gap-4 rounded-2xl bg-paper p-6 shadow-card">
            <div>
              <p className="text-sm text-muted">Plan</p>
              <p className="font-display text-3xl text-navy">
                {selected.name} · {selected.price}
              </p>
            </div>
            <ul className="grid gap-1 text-sm text-ink">
              {selected.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {code === "office" ? (
              <p className="text-sm text-muted">Extra Admin — $19/mo. Shown as a line item. Not billed in this demo.</p>
            ) : (
              <p className="text-sm text-muted">No extra Admin seats. The owner runs the book.</p>
            )}
            <p className="text-sm text-muted">Card billing will be enabled on getcrewweek.com. This is a dry run.</p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("choose")} disabled={busy}>
                Back
              </Button>
              <Button type="button" onClick={() => void confirm()} disabled={busy}>
                {busy ? "Starting…" : code === "office" ? "Start Office" : "Start Crew"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </SiteChrome>
  );
}
