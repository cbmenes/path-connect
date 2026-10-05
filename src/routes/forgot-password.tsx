import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/brand";
import { bootstrapDemo } from "@/lib/sweepbook/bootstrap";
import { requestPasswordReset } from "@/lib/sweepbook/password-reset";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    message: string;
    previewHint?: string;
    previewResetUrl?: string;
  } | null>(null);

  useEffect(() => {
    void bootstrapDemo();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await requestPasswordReset({ data: { email } });
      setDone({
        message: res.message,
        previewHint: res.previewHint,
        previewResetUrl: res.previewResetUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <CrewWeekLogo className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-navy">Forgot password?</h1>
          <p className="mt-1 text-sm text-muted">Enter the email on your {APP_NAME} login. We will send a reset link if it is on file.</p>
        </div>
        {done ? (
          <div className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
            <p className="text-sm text-ink">{done.message}</p>
            {done.previewHint ? <p className="text-xs text-muted">{done.previewHint}</p> : null}
            {done.previewResetUrl ? (
              <p className="text-xs text-muted">
                Development preview:{" "}
                <a href={done.previewResetUrl} className="text-navy underline-offset-4 hover:underline">
                  open the reset link
                </a>
              </p>
            ) : null}
            <Button asChild>
              <Link to="/login">Back to log in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted">
          Remember it?{" "}
          <Link to="/login" className="text-navy underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
