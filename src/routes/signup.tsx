import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { completeOnboarding } from "@/lib/sweepbook/bootstrap";
import { beginStripeCheckout, type SaasPlanCode } from "@/lib/sweepbook/plan";
import { displayName } from "@/lib/sweepbook/people";
import { CrewWeekLogo } from "@/components/brand/logo";
import { NameFields } from "@/components/app/name-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { cn } from "@/lib/utils";

type Search = { plan?: SaasPlanCode };

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: s.plan === "office" || s.plan === "crew" ? s.plan : undefined,
  }),
  component: Signup,
});

function storeBearer(token?: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

function Signup() {
  const search = Route.useSearch();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<SaasPlanCode>(search.plan ?? "crew");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const name = displayName(firstName, lastName);
      const { data, error: err } = await authClient.signUp.email({ email, password, name });
      let token = data?.token;
      if (err || !token) {
        const signed = await authClient.signIn.email({ email, password });
        if (signed.error) throw new Error(err?.message || signed.error.message || "Could not create the account.");
        token = signed.data?.token;
      }
      storeBearer(token);
      await completeOnboarding({ data: { role: "cleaner", firstName, lastName, businessName: business, plan } });
      const session = await beginStripeCheckout({ data: { code: plan } });
      window.location.assign(session.url);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <CrewWeekLogo className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-navy">Create your account</h1>
          <p className="mt-1 text-sm text-muted">The Crew Plan is $39/mo. The Office Plan is $79/mo. The business owner pays. Cleaners and clients are not billed.</p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-ink">Plan</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["crew", "Crew Plan", "$39/mo"],
                  ["office", "Office Plan", "$79/mo"],
                ] as const
              ).map(([code, label, price]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPlan(code)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-left",
                    plan === code ? "bg-navy text-paper" : "bg-secondary text-ink",
                  )}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-sm tabular">{price}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
          <Field label="Business name" hint="Shown to your clients.">
            <Input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Brooks Clean Co." />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Opening Stripe…" : "Continue to checkout"}
          </Button>
        </form>
        {authEnabled ? (
          <div className="grid gap-2">
            {GROK_PROVIDERS.map((p) => (
              <Button key={p.providerId} variant="ghost" type="button" onClick={() => signIn(p.providerId, { callbackURL: "/onboarding" })}>
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : null}
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-navy underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
