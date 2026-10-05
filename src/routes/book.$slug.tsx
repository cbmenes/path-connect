import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/book/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/request/$slug", params: { slug: params.slug } });
  },
  component: () => null,
});
