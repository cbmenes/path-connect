import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { completeOnboarding } from "@/lib/sweepbook/bootstrap";
import { splitDisplayName } from "@/lib/sweepbook/people";
import { NameFields } from "@/components/app/name-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SiteChrome } from "@/components/marketing/site-chrome";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [role, setRole] = useState<"cleaner" | "client">("cleaner");
  const initial = splitDisplayName(user?.displayName);
  const [firstName, setFirstName] = useState(initial.first_name);
  const [lastName, setLastName] = useState(initial.last_name);
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <SiteChrome><div className="h-40 animate-pulse bg-secondary" /></SiteChrome>;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ data: { role, firstName, lastName, businessName: business } });
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <form onSubmit={submit} className="mx-auto grid max-w-md gap-4 px-4 py-12">
        <h1 className="font-display text-3xl text-navy">How will you use SweepBook?</h1>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setRole("cleaner")}
            className={`rounded-xl border p-4 text-left ${role === "cleaner" ? "border-navy bg-paper shadow-card" : "border-border"}`}
          >
            <p className="font-medium">I am the cleaner</p>
            <p className="text-sm text-muted">I schedule visits and invoice my own clients.</p>
          </button>
          <button
            type="button"
            onClick={() => setRole("client")}
            className={`rounded-xl border p-4 text-left ${role === "client" ? "border-navy bg-paper shadow-card" : "border-border"}`}
          >
            <p className="font-medium">I am a client</p>
            <p className="text-sm text-muted">I was invited by my cleaner.</p>
          </button>
        </div>
        <NameFields firstName={firstName} lastName={lastName} onFirst={setFirstName} onLast={setLastName} />
        {role === "cleaner" ? (
          <Field label="Business name">
            <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
          </Field>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </Button>
      </form>
    </SiteChrome>
  );
}
