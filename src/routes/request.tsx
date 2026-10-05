import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/request")({ component: RequestLayout });

function RequestLayout() {
  return <Outlet />;
}
