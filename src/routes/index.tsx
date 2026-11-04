import { createFileRoute } from "@tanstack/react-router";
import { PathConnectGame } from "@/components/path-connect/path-connect-game";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Path Connect" },
      {
        name: "description",
        content: "Rotate tiles until a path runs from the source to the outlet.",
      },
    ],
  }),
});

function Home() {
  return <PathConnectGame />;
}
