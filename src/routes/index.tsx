import { createFileRoute } from "@tanstack/react-router";
import { PathConnectGame } from "@/components/path-connect/path-connect-game";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Path Connect" },
      {
        name: "description",
        content: "Turn the cream tiles and connect every light, sensor, or detector with one copper-colored pipe run.",
      },
    ],
  }),
});

function Home() {
  return <PathConnectGame />;
}
