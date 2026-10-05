import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/clients/import")({
  component: () => <Navigate to="/app/data" search={{ kind: "clients" }} />,
});
