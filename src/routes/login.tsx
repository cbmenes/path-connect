import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, hasRememberedLogin, rememberBearer, signIn } from "@/lib/auth/client";
import { CrewWeekLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { isDemoAccountEmail } from "@/lib/sweepbook/types";

export const Route = createFileRoute("/login")({
  component: Login,
});

function storeBearer(token?: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

export async function emailSignIn(email: string, password: string, stayLoggedIn = false) {
  const { data, error } = await authClient.signIn.email({ email, password, rememberMe: true });
  if (error) throw new Error(error.message || "Could not sign in.");
  storeBearer(data?.token);
  if (stayLoggedIn && data?.token) {
    rememberBearer(data.token);
    const res = await fetch("/api/session/remember", { method: "POST", credentials: "same-origin" });
    if (!res.ok) throw new Error("Could not keep you logged in.");
  }
  return data;
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const staying = hasRememberedLogin();
      const { data, error } = await authClient.getSession();
      if (cancel || error) return;
      const email = data?.user?.email;
      if (!email) return;
      if (isDemoAccountEmail(email) && !staying) {
        // Drop a leftover one-click demo session. The form stays on this page.
        await authClient.signOut();
        try {
          sessionStorage.removeItem("grok-auth.bearer-token");
          localStorage.removeItem("grok-auth.stay");
        } catch {
          /* ignore */
        }
        return;
      }
      if (staying) void navigate({ to: "/app" });
    })();
    return () => {
      cancel = true;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await emailSignIn(email, password, stayLoggedIn);
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <CrewWeekLogo className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-navy">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Cleaners and clients use the same website.</p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-navy"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
            />
            Stay logged in for 30 days.
          </label>
          <p className="text-right text-sm">
            <Link to="/forgot-password" className="text-navy underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </Button>
        </form>
        {authEnabled ? (
          <div className="grid gap-2">
            {GROK_PROVIDERS.map((p) => (
              <Button key={p.providerId} variant="ghost" type="button" onClick={() => signIn(p.providerId, { callbackURL: "/app" })}>
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : null}
        <p className="text-center text-sm text-muted">
          New cleaner?{" "}
          <Link to="/signup" className="text-navy underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
