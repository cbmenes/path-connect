import { createFileRoute, Link } from "@tanstack/react-router";
import { CrewWeekLogo } from "@/components/brand/logo";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

function Welcome() {
  const { user, isPending } = useCurrentUserState();

  return (
    <SiteChrome>
      <div className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <div className="text-center">
          <CrewWeekLogo className="justify-center" />
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-sage">Welcome</p>
          <h1 className="mt-2 font-display text-3xl text-navy">Your account is active</h1>
          <p className="mt-2 text-sm text-muted">
            Payment went through. CrewWeek is ready for the week ahead.
          </p>
        </div>
        <div className="grid gap-3 rounded-xl bg-paper p-5 shadow-card">
          {isPending ? (
            <div className="h-11 animate-pulse rounded-md bg-secondary" />
          ) : user ? (
            <Button asChild>
              <Link to="/app">Go to your dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Log in</Link>
            </Button>
          )}
          {!isPending ? (
            <p className="text-center text-sm text-muted">
              {user
                ? "You are signed in on this browser."
                : "Use the email and password from signup."}
            </p>
          ) : null}
        </div>
      </div>
    </SiteChrome>
  );
}
