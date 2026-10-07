import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { resumeSaasPlan, planCodeFromCents } from "@/lib/sweepbook/plan";
import { isDemoAccountEmail, type Profile } from "@/lib/sweepbook/types";
import { Button } from "@/components/ui/button";

export function PlanBanner({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const code = planCodeFromCents(profile.plan_price_cents);
  const name = code === "office" ? "Office" : "Crew";
  const inactive =
    !isDemoAccountEmail(profile.email) &&
    (profile.plan_status === "pending" || profile.plan_status === "canceled");
  if (!inactive && profile.plan_status !== "active" && profile.plan_status !== "canceled") return null;
  const canceled = profile.plan_status === "canceled";
  const text = inactive ? "Your plan is inactive." : canceled ? `${name} plan canceled` : `${name} plan`;

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
                toast.success(`${name} plan resumed`);
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
