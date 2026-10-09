import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { resumeSaasPlan, paidPeriodEnded, planCodeFromCents } from "@/lib/sweepbook/plan";
import { formatDate } from "@/lib/sweepbook/time";
import { isDemoAccountEmail, type Profile } from "@/lib/sweepbook/types";
import { Button } from "@/components/ui/button";

export function PlanBanner({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const code =
    profile.plan_code === "office" || profile.plan_code === "crew"
      ? profile.plan_code
      : planCodeFromCents(profile.plan_price_cents);
  const name = code === "office" ? "Office Plan" : "Crew Plan";
  const ended = paidPeriodEnded({
    cancelAtPeriodEnd: profile.cancel_at_period_end,
    periodEnd: profile.current_period_end,
  });
  const inactive =
    !isDemoAccountEmail(profile.email) &&
    (profile.plan_status === "pending" || profile.plan_status === "canceled" || ended);
  if (!inactive && profile.plan_status !== "active" && profile.plan_status !== "canceled") return null;
  const canceled = profile.plan_status === "canceled";
  const paidThrough =
    profile.cancel_at_period_end && profile.current_period_end
      ? formatDate(profile.current_period_end, { month: "long", day: "numeric", year: "numeric" })
      : null;
  const text = inactive
    ? "Your plan is inactive."
    : paidThrough
      ? `${name} paid through ${paidThrough}`
      : canceled
        ? `${name} canceled`
        : name;

  return (
    <div className="border-b border-border bg-sage-soft px-4 py-3 print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink">{text}</p>
        {inactive || canceled ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const resumed = await resumeSaasPlan({ data: {} });
                if (resumed.url) {
                  window.location.assign(resumed.url);
                  return;
                }
                await qc.invalidateQueries({ queryKey: ["actor"] });
                await qc.invalidateQueries({ queryKey: ["saas-plan"] });
                toast.success(`${name} resumed`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not resume the plan.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Resuming…" : "Resume plan"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
