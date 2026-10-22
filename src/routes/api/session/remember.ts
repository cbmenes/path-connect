import { createFileRoute } from "@tanstack/react-router";
import { rememberSession } from "@/lib/sweepbook/stay-logged-in";

export const Route = createFileRoute("/api/session/remember")({
  server: {
    handlers: {
      POST: ({ request }) => rememberSession(request),
    },
  },
});
