import { baseMask, openingIds, type DirId, type Kind } from "@/lib/path-connect/logic";
import type { Conduit } from "@/lib/path-connect/styles";

/**
 * Draws a tile at rotation 0. The board rotates this SVG clockwise, which
 * matches the rules engine. Add a conduit by extending `WIDTHS` and, if the
 * stroke treatment is new, a branch in the markup. Do not teach this file
 * about levels or path search.
 */

const ENDS: Record<DirId, [number, number]> = {
  N: [50, 1],
  E: [99, 50],
  S: [50, 99],
  W: [1, 50],
};

const WIDTHS: Record<Conduit, { casing: number; bore: number; hub: number }> = {
  pipe: { casing: 30, bore: 14, hub: 16 },
  trace: { casing: 0, bore: 6, hub: 5 },
  beam: { casing: 0, bore: 4, hub: 4 },
};

export function TileArt({
  kind,
  conduit,
  live,
  hub,
}: {
  kind: Kind;
  conduit: Conduit;
  live: boolean;
  hub: "start" | "end" | "plain";
}) {
  const widths = WIDTHS[conduit];
  const arms = openingIds(baseMask(kind));
  const bore = live ? "var(--color-pc-flow)" : "var(--color-pc-bore)";
  const casing = "var(--color-pc-casing)";
  const liveClass = live ? "pc-bore pc-bore-live" : "pc-bore";

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {widths.casing > 0 &&
        arms.map((dir) => (
          <line
            key={`case-${dir}`}
            x1={50}
            y1={50}
            x2={ENDS[dir][0]}
            y2={ENDS[dir][1]}
            stroke={casing}
            strokeWidth={widths.casing}
            strokeLinecap="round"
          />
        ))}
      {arms.map((dir) => (
        <line
          key={`bore-${dir}`}
          x1={50}
          y1={50}
          x2={ENDS[dir][0]}
          y2={ENDS[dir][1]}
          stroke={bore}
          strokeWidth={widths.bore}
          strokeLinecap="round"
          className={liveClass}
        />
      ))}
      {arms.map((dir) => (
        <line
          key={`stream-${dir}`}
          x1={50}
          y1={50}
          x2={ENDS[dir][0]}
          y2={ENDS[dir][1]}
          stroke="var(--color-pc-fg)"
          strokeWidth={Math.max(2, widths.bore * 0.35)}
          strokeLinecap="round"
          strokeDasharray={conduit === "beam" ? "2 14" : "7 16"}
          className="pc-stream"
          opacity={live ? 0.75 : 0}
        />
      ))}
      <Hub
        conduit={conduit}
        hub={hub}
        bore={bore}
        casing={casing}
        radius={widths.hub}
        live={live}
      />
    </svg>
  );
}

function Hub({
  conduit,
  hub,
  bore,
  casing,
  radius,
  live,
}: {
  conduit: Conduit;
  hub: "start" | "end" | "plain";
  bore: string;
  casing: string;
  radius: number;
  live: boolean;
}) {
  if (hub === "start") {
    return <circle cx={50} cy={50} r={conduit === "pipe" ? 15 : 8} fill="var(--color-pc-start)" />;
  }
  if (hub === "end") {
    return (
      <>
        <circle cx={50} cy={50} r={conduit === "pipe" ? 16 : 9} fill="var(--color-pc-tile)" />
        <circle
          cx={50}
          cy={50}
          r={conduit === "pipe" ? 11 : 6.5}
          fill="none"
          stroke="var(--color-pc-flow)"
          strokeWidth={conduit === "pipe" ? 4 : 2}
          className="pc-bore"
        />
      </>
    );
  }
  if (conduit === "pipe") {
    return (
      <>
        <circle cx={50} cy={50} r={radius} fill={casing} />
        <circle
          cx={50}
          cy={50}
          r={radius * 0.48}
          fill={bore}
          className={live ? "pc-bore pc-bore-live" : "pc-bore"}
        />
      </>
    );
  }
  return (
    <circle
      cx={50}
      cy={50}
      r={radius}
      fill={bore}
      className={live ? "pc-bore pc-bore-live" : "pc-bore"}
    />
  );
}
