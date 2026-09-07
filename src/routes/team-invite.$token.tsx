import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptTeamInvite, getTeamInvitePublic } from "@/lib/sweepbook/team";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SiteChrome } from "@/components/marketing/site-chrome";

export const Route = createFileRoute("/team-invite/$token")({ component: TeamInvitePage });

function storeBearer(token?: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

function TeamInvitePage() {
  const { token } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const invite = useQuery({ queryKey: ["team-invite", token], queryFn: () => getTeamInvitePublic({ data: token }) });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invite.data?.email) setEmail(invite.data.email);
    if (invite.data?.name) setName(invite.data.name);
  }, [invite.data]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await acceptTeamInvite({ data: token });
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await authClient.signUp.email({ email, password, name });
      if (err) throw new Error(err.message || "Could not create the account.");
      storeBearer(data?.token);
      if (!data?.token) {
        const signed = await authClient.signIn.email({ email, password });
        storeBearer(signed.data?.token);
      }
      await acceptTeamInvite({ data: token });
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto max-w-md px-4 py-14">
        {invite.isError ? (
          <p className="text-danger">{(invite.error as Error).message}</p>
        ) : invite.data ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">
              {invite.data.invite_kind === "admin" ? "Admin invite" : "Team invite"}
            </p>
            <h1 className="mt-2 font-display text-3xl text-navy">
              Join {invite.data.business_name || invite.data.cleaner_name}
            </h1>
            <p className="mt-2 text-muted">
              {invite.data.invite_kind === "admin"
                ? "You’ll help run the office — clients, the calendar, and team cleaners. The owner’s billing and team pay stay with them."
                : "You’ll see the jobs assigned to you — addresses, notes, and times. Payment cards stay with the owner."}
            </p>
            {invite.data.accepted_at ? (
              <p className="mt-6 text-sm text-muted">
                This invite was already used.{" "}
                <Link to="/login" className="text-navy underline">
                  Log in
                </Link>
              </p>
            ) : isPending ? (
              <div className="mt-6 h-24 animate-pulse rounded-xl bg-secondary" />
            ) : user ? (
              <div className="mt-6 grid gap-3">
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button disabled={busy} onClick={() => void join()}>
                  {busy ? "Joining…" : invite.data.invite_kind === "admin" ? "Join as admin" : "Join the team"}
                </Button>
              </div>
            ) : (
              <form onSubmit={signup} className="mt-6 grid gap-3 rounded-xl bg-paper p-5 shadow-card">
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Password" hint="At least 8 characters.">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </Field>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating…" : invite.data.invite_kind === "admin" ? "Create admin login" : "Create team login"}
                </Button>
                <p className="text-center text-sm text-muted">
                  Already have an account?{" "}
                  <Link to="/login" className="text-navy underline">
                    Log in
                  </Link>{" "}
                  then return to this link.
                </p>
              </form>
            )}
          </>
        ) : (
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        )}
      </div>
    </SiteChrome>
  );
}
