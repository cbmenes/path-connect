import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { isOfficeActor } from "@/lib/sweepbook/types";

export const Route = createFileRoute("/app/requests")({ component: RequestsLayout });

function RequestsLayout() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  if (actor.isPending) return <div className="h-32 animate-pulse rounded-xl bg-secondary" />;
  if (!isOfficeActor(actor.data)) return <Navigate to="/app" />;
  return <Outlet />;
}
