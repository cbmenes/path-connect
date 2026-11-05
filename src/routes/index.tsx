import { createFileRoute } from "@tanstack/react-router";
import { PathConnectGame } from "@/components/path-connect/path-connect-game";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Path Connect" },
      {
        name: "description",
        content: "Rotate wire tiles until every node is powered from the panel.",
      },
    ],
  }),
});

function Home() {
  return <PathConnectGame />;
}
