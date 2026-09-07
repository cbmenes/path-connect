import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { bootstrapDemo } from "@/lib/sweepbook/bootstrap";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_CLEANER_EMAIL,
  DEMO_CLEANER_PASSWORD,
  DEMO_CLIENT_EMAIL,
  DEMO_CLIENT_PASSWORD,
  DEMO_TEAM_EMAIL,
  DEMO_TEAM_PASSWORD,
} from "@/lib/sweepbook/types";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SiteChrome } from "@/components/marketing/site-chrome";

type Search = { demo?: "cleaner" | "client" | "team" | "admin" };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    demo: s.demo === "client" || s.demo === "cleaner" || s.demo === "team" || s.demo === "admin" ? s.demo : undefined,
  }),
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

export async function emailSignIn(email: string, password: string) {
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message || "Could not sign in.");
  storeBearer(data?.token);
  return data;
}

function Login() {
  const { demo } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    demo === "client"
      ? DEMO_CLIENT_EMAIL
      : demo === "team"
        ? DEMO_TEAM_EMAIL
        : demo === "admin"
          ? DEMO_ADMIN_EMAIL
          : demo === "cleaner"
            ? DEMO_CLEANER_EMAIL
            : "",
  );
  const [password, setPassword] = useState(
    demo === "client"
      ? DEMO_CLIENT_PASSWORD
      : demo === "team"
        ? DEMO_TEAM_PASSWORD
        : demo === "admin"
          ? DEMO_ADMIN_PASSWORD
          : demo === "cleaner"
            ? DEMO_CLEANER_PASSWORD
            : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bootstrapDemo();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await emailSignIn(email, password);
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function useDemo(kind: "cleaner" | "client" | "team" | "admin") {
    setBusy(true);
    setError(null);
    try {
      await bootstrapDemo();
      if (kind === "cleaner") await emailSignIn(DEMO_CLEANER_EMAIL, DEMO_CLEANER_PASSWORD);
      else if (kind === "team") await emailSignIn(DEMO_TEAM_EMAIL, DEMO_TEAM_PASSWORD);
      else if (kind === "admin") await emailSignIn(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
      else await emailSignIn(DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD);
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <Wordmark className="justify-center" />
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <div className="grid gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void useDemo("cleaner")}>
            Open cleaner demo
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void useDemo("admin")}>
            Open admin demo
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void useDemo("team")}>
            Open team demo
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void useDemo("client")}>
            Open client demo
          </Button>
          <p className="text-center text-xs text-muted">
            Owner {DEMO_CLEANER_EMAIL} / {DEMO_CLEANER_PASSWORD} · Admin {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD} · Team{" "}
            {DEMO_TEAM_EMAIL} / {DEMO_TEAM_PASSWORD} · Client {DEMO_CLIENT_EMAIL} / {DEMO_CLIENT_PASSWORD}
          </p>
        </div>
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
