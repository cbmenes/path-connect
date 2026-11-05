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

const WIDTHS: Record<
  Conduit,
  { casing: number; bore: number; core: number; hub: number; stream: number }
> = {
  pipe: { casing: 36, bore: 20, core: 6, hub: 20, stream: 8 },
  trace: { casing: 24, bore: 14, core: 5, hub: 11, stream: 4 },
  beam: { casing: 0, bore: 4, core: 0, hub: 4, stream: 2 },
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
  const core = live ? "var(--color-pc-spark)" : "var(--color-pc-core)";
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
      {widths.core > 0 &&
        arms.map((dir) => (
          <line
            key={`core-${dir}`}
            x1={50}
            y1={50}
            x2={ENDS[dir][0]}
            y2={ENDS[dir][1]}
            stroke={core}
            strokeWidth={widths.core}
            strokeLinecap="round"
            className={live ? "pc-core pc-core-live" : "pc-core"}
          />
        ))}
      {arms.map((dir) => (
        <line
          key={`stream-${dir}`}
          x1={50}
          y1={50}
          x2={ENDS[dir][0]}
          y2={ENDS[dir][1]}
          stroke="var(--color-pc-spark)"
          strokeWidth={widths.stream}
          strokeLinecap="round"
          strokeDasharray={conduit === "trace" ? "6 14" : conduit === "beam" ? "2 14" : "11 16"}
          className="pc-stream"
        />
      ))}
      {conduit === "trace" &&
        arms.map((dir) => (
          <line
            key={`spark-${dir}`}
            x1={50}
            y1={50}
            x2={ENDS[dir][0]}
            y2={ENDS[dir][1]}
            stroke="var(--color-pc-spark)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="2 22"
            className="pc-spark-line"
          />
        ))}
      <Hub
        conduit={conduit}
        hub={hub}
        bore={bore}
        casing={casing}
        core={core}
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
  core,
  radius,
  live,
}: {
  conduit: Conduit;
  hub: "start" | "end" | "plain";
  bore: string;
  casing: string;
  core: string;
  radius: number;
  live: boolean;
}) {
  const liveClass = live ? "pc-bore pc-bore-live" : "pc-bore";
  if (hub === "start") {
    return (
      <circle cx={50} cy={50} r={conduit === "pipe" ? 16 : 12} fill="var(--color-pc-start)" />
    );
  }
  if (hub === "end") {
    const ring = conduit === "pipe" ? 12 : 9;
    return (
      <>
        <circle cx={50} cy={50} r={ring + 5} fill="var(--color-pc-tile)" />
        <circle
          cx={50}
          cy={50}
          r={ring}
          fill="none"
          stroke="var(--color-pc-flow)"
          strokeWidth={conduit === "pipe" ? 4.5 : 3.5}
          className="pc-bore"
        />
        <circle cx={50} cy={50} r={ring * 0.38} fill={core} className="pc-core" />
      </>
    );
  }
  if (conduit === "pipe") {
    return (
      <>
        <circle cx={50} cy={50} r={radius} fill={casing} />
        <circle cx={50} cy={50} r={radius * 0.52} fill={bore} className={liveClass} />
        <circle cx={50} cy={50} r={radius * 0.18} fill={core} className="pc-core" />
      </>
    );
  }
  if (conduit === "trace") {
    return (
      <>
        <circle cx={50} cy={50} r={radius + 3} fill={casing} />
        <circle cx={50} cy={50} r={radius} fill={bore} className={liveClass} />
        <circle
          cx={50}
          cy={50}
          r={radius * 0.42}
          fill={core}
          className={live ? "pc-core pc-core-live" : "pc-core"}
        />
      </>
    );
  }
  return <circle cx={50} cy={50} r={radius} fill={bore} className={liveClass} />;
}
