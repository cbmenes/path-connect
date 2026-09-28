import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { completePasswordReset } from "@/lib/sweepbook/password-reset";

type Search = { token?: string };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" && s.token.trim() ? s.token.trim() : undefined,
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completePasswordReset({ data: { token, password, confirm } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <CrewWeekLogo className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-navy">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted">This does not change your email or role. Then you can log in.</p>
        </div>
        {!token ? (
          <div className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
            <p className="text-sm text-ink">This reset link is invalid or has expired.</p>
            <Button asChild>
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
            <p className="text-sm text-ink">Your password was updated. You can log in now.</p>
            <Button onClick={() => void navigate({ to: "/login" })}>Log in</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
            <Field label="New password" hint="At least 8 characters.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Submit"}
            </Button>
          </form>
        )}
      </div>
    </SiteChrome>
  );
}
