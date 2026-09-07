import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const actor = useQuery({
    queryKey: ["actor", user?.id],
    queryFn: () => getMyActor(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user || actor.isPending) return;
    if (actor.data?.kind === "none") {
      void navigate({ to: "/onboarding" });
    }
  }, [user, actor.data, actor.isPending, navigate]);

  useEffect(() => {
    if (actor.data?.kind !== "team") return;
    if (
      pathname.startsWith("/app/clients") ||
      pathname.startsWith("/app/payments") ||
      pathname.startsWith("/app/team") ||
      pathname.startsWith("/app/team-pay") ||
      pathname.startsWith("/app/data") ||
      pathname.startsWith("/app/jobs/new")
    ) {
      void navigate({ to: "/app" });
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

  return (
    <AppShell actor={actor.data}>
      <Outlet />
    </AppShell>
  );
}
