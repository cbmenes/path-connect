import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkoutSuccess = useRouterState({ select: (s) => s.location.href.includes("checkout=success") });
  const actor = useQuery({
    queryKey: ["actor", user?.id],
    queryFn: () => getMyActor(),
    enabled: Boolean(user),
    refetchInterval: (query) => {
      if (!checkoutSuccess) return false;
      const data = query.state.data;
      if (data?.kind === "cleaner" && (data.profile.plan_status === "pending" || data.profile.plan_status === "trial")) {
        return 2000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!user || actor.isPending) return;
    if (actor.data?.kind === "none") {
      void navigate({ to: "/onboarding" });
      return;
    }
    const status = actor.data?.kind === "cleaner" ? actor.data.profile.plan_status : null;
    const needsPlan = status === "trial" || status === "pending";
    if (needsPlan && !checkoutSuccess && pathname.startsWith("/app")) {
      void navigate({ to: "/choose-plan" });
    }
  }, [user, actor.data, actor.isPending, navigate, pathname, checkoutSuccess]);

  useEffect(() => {
    if (actor.data?.kind === "team") {
      if (
        pathname.startsWith("/app/clients") ||
        pathname.startsWith("/app/payments") ||
        pathname.startsWith("/app/team") ||
        pathname.startsWith("/app/team-pay") ||
        pathname.startsWith("/app/data") ||
        pathname.startsWith("/app/jobs/new") ||
        pathname.startsWith("/app/requests") ||
        pathname.startsWith("/app/checklists")
      ) {
        void navigate({ to: "/app" });
      }
      return;
    }
    if (actor.data?.kind === "admin") {
      if (
        pathname.startsWith("/app/team-pay") ||
        pathname.startsWith("/app/data") ||
        pathname.startsWith("/app/clients/import")
      ) {
        void navigate({ to: "/app" });
      }
      return;
    }
    if (actor.data?.kind === "client" || actor.data?.kind === "client_unlinked") {
      if (
        pathname.startsWith("/app/sheet") ||
        pathname.startsWith("/app/requests") ||
        pathname.startsWith("/app/time-off") ||
        pathname.startsWith("/app/checklists")
      ) {
        void navigate({ to: "/app/visits" });
      }
    }
  }, [actor.data?.kind, pathname, navigate]);

  if (isPending) {
    return <div className="min-h-dvh bg-bg p-6"><div className="h-32 animate-pulse rounded-xl bg-secondary" /></div>;
  }
  if (!user) return <RedirectToSignIn />;
  if (actor.isPending || !actor.data) {
    return <div className="min-h-dvh bg-bg p-6"><div className="h-32 animate-pulse rounded-xl bg-secondary" /></div>;
  }
  if (actor.data.kind === "none") {
    return <div className="min-h-dvh bg-bg p-6"><div className="h-32 animate-pulse rounded-xl bg-secondary" /></div>;
  }

  if (
    checkoutSuccess &&
    actor.data.kind === "cleaner" &&
    actor.data.profile.plan_status !== "active"
  ) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-lg place-content-center gap-3 bg-bg px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">Checkout</p>
        <h1 className="font-display text-3xl text-navy">Confirming your plan</h1>
        <p className="text-sm text-muted">
          Stripe is the source of truth. This page updates when the subscription is confirmed. It does not activate the plan by itself.
        </p>
        <Button variant="outline" asChild>
          <Link to="/choose-plan">Back to plans</Link>
        </Button>
      </div>
    );
  }

  return (
    <AppShell actor={actor.data}>
      <Outlet />
    </AppShell>
  );
}
