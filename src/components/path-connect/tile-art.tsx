import { useId } from "react";
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
  trace: { casing: 40, bore: 24, core: 9, hub: 14, stream: 8 },
  beam: { casing: 0, bore: 4, core: 0, hub: 4, stream: 2 },
};

/**
 * Pipe width in tile units. Each opening is a straight run through the
 * center of a tile edge, extended across the gap so the neighbor's butt
 * end overlaps it. Corners turn at the tile center, not on an arc, so the
 * exit stays perpendicular to the edge.
 */
const PIPE_WIDTH = 32;

const PIPE_ENDS: Record<DirId, [number, number]> = {
  N: [50, -8],
  E: [108, 50],
  S: [50, 108],
  W: [-8, 50],
};

const OPPOSITE: Record<DirId, DirId> = { N: "S", E: "W", S: "N", W: "E" };

function armPath(dir: DirId): string {
  const [x, y] = PIPE_ENDS[dir];
  return `M 50 50 L ${x} ${y}`;
}

function CozyPipe({ arms, hub }: { arms: DirId[]; hub: "start" | "end" | "plain" }) {
  const uid = useId().replace(/:/g, "");
  if (arms.length === 0) return null;
  const straight = arms.length === 2 && OPPOSITE[arms[0]!] === arms[1];
  const corner = arms.length === 2 && !straight;
  const paths: { d: string; grad: string }[] = [];

  if (straight || corner) {
    if (straight) {
      const horizontal = arms[0] === "E" || arms[0] === "W";
      const [x1, y1] = PIPE_ENDS[arms[0]!];
      const [x2, y2] = PIPE_ENDS[arms[1]!];
      paths.push({
        d: `M ${x1} ${y1} L ${x2} ${y2}`,
        grad: horizontal ? `${uid}-h` : `${uid}-v`,
      });
    } else {
      for (const dir of arms) {
        const horizontal = dir === "E" || dir === "W";
        paths.push({ d: armPath(dir), grad: horizontal ? `${uid}-h` : `${uid}-v` });
      }
    }
  } else {
    for (const dir of arms) {
      const horizontal = dir === "E" || dir === "W";
      paths.push({ d: armPath(dir), grad: horizontal ? `${uid}-h` : `${uid}-v` });
    }
  }

  const showHub = !straight;
  const cap = { fill: "none", strokeLinecap: "butt", strokeLinejoin: "miter" } as const;
  return (
    <svg viewBox="0 0 100 100" overflow="visible" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-h`} gradientUnits="userSpaceOnUse" x1="0" y1={50 - PIPE_WIDTH / 2} x2="0" y2={50 + PIPE_WIDTH / 2}>
          <stop offset="0" stopColor="var(--color-pc-pipe-light)" />
          <stop offset="0.42" stopColor="var(--color-pc-casing)" />
          <stop offset="1" stopColor="var(--color-pc-shade)" />
        </linearGradient>
        <linearGradient id={`${uid}-v`} gradientUnits="userSpaceOnUse" x1={50 - PIPE_WIDTH / 2} y1="0" x2={50 + PIPE_WIDTH / 2} y2="0">
          <stop offset="0" stopColor="var(--color-pc-pipe-light)" />
          <stop offset="0.42" stopColor="var(--color-pc-casing)" />
          <stop offset="1" stopColor="var(--color-pc-shade)" />
        </linearGradient>
      </defs>
      {showHub && hub !== "end" && (
        <circle cx="50" cy="50" r={PIPE_WIDTH / 2} fill="var(--color-pc-casing)" />
      )}
      {paths.map((path, index) => (
        <path key={index} d={path.d} stroke={`url(#${path.grad})`} strokeWidth={PIPE_WIDTH} {...cap} />
      ))}
    </svg>
  );
}

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
  const arms = openingIds(baseMask(kind));
  if (conduit === "pipe") return <CozyPipe arms={arms} hub={hub} />;
  const widths = WIDTHS[conduit];
  const bore = live ? "var(--color-pc-flow)" : "var(--color-pc-bore)";
  const casing = "var(--color-pc-casing)";
  const core = live
    ? "var(--color-pc-spark)"
    : conduit === "trace"
      ? "var(--color-pc-casing)"
      : "var(--color-pc-core)";
  const liveClass = live ? "pc-bore pc-bore-live" : "pc-bore";
  const cap = conduit === "trace" ? "butt" : "round";
  const ends: Record<DirId, [number, number]> =
    conduit === "trace"
      ? { N: [50, 0], E: [100, 50], S: [50, 100], W: [0, 50] }
      : ENDS;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {widths.casing > 0 &&
        arms.map((dir) => (
          <line
            key={`case-${dir}`}
            x1={50}
            y1={50}
            x2={ends[dir][0]}
            y2={ends[dir][1]}
            stroke={casing}
            strokeWidth={widths.casing}
            strokeLinecap={cap}
          />
        ))}
      {arms.map((dir) => (
        <line
          key={`bore-${dir}`}
          x1={50}
          y1={50}
          x2={ends[dir][0]}
          y2={ends[dir][1]}
          stroke={bore}
          strokeWidth={widths.bore}
          strokeLinecap={cap}
          className={liveClass}
        />
      ))}
      {widths.core > 0 &&
        arms.map((dir) => (
          <line
            key={`core-${dir}`}
            x1={50}
            y1={50}
            x2={ends[dir][0]}
            y2={ends[dir][1]}
            stroke={core}
            strokeWidth={widths.core}
            strokeLinecap={cap}
            className={live ? "pc-core pc-core-live" : "pc-core"}
          />
        ))}
      {arms.map((dir) => (
        <line
          key={`stream-${dir}`}
          x1={50}
          y1={50}
          x2={ends[dir][0]}
          y2={ends[dir][1]}
          stroke="var(--color-pc-spark)"
          strokeWidth={widths.stream}
          strokeLinecap={cap}
          strokeDasharray={conduit === "trace" ? "6 14" : conduit === "beam" ? "2 14" : "11 16"}
          className="pc-stream"
        />
      ))}
      {conduit === "trace" &&
        arms.map((dir) => (
          <line
            key={`ridge-${dir}`}
            x1={50}
            y1={50}
            x2={ends[dir][0]}
            y2={ends[dir][1]}
            stroke="white"
            strokeOpacity={live ? 0.75 : 0.35}
            strokeWidth={4}
            strokeLinecap={cap}
            className="pc-ridge"
          />
        ))}
      {conduit === "trace" &&
        arms.map((dir) => (
          <line
            key={`spark-${dir}`}
            x1={50}
            y1={50}
            x2={ends[dir][0]}
            y2={ends[dir][1]}
            stroke="var(--color-pc-spark)"
            strokeWidth={7}
            strokeLinecap={cap}
            strokeDasharray="4 18"
            className="pc-spark-line"
          />
        ))}
      {conduit === "trace" &&
        arms.map((dir) => (
          <line
            key={`spark-back-${dir}`}
            x1={50}
            y1={50}
            x2={ends[dir][0]}
            y2={ends[dir][1]}
            stroke="var(--color-pc-flow)"
            strokeWidth={3}
            strokeLinecap={cap}
            strokeDasharray="2 26"
            className="pc-spark-back"
          />
        ))}
      {conduit === "trace" && live && (
        <g className="pc-spark-dots" fill="var(--color-pc-spark)">
          <circle cx={36} cy={40} r={2.2} />
          <circle cx={64} cy={44} r={1.6} />
          <circle cx={46} cy={66} r={1.8} />
        </g>
      )}
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
      <circle cx={50} cy={50} r={conduit === "pipe" ? 16 : 15} fill="var(--color-pc-start)" />
    );
  }
  if (hub === "end") {
    const ring = conduit === "pipe" ? 12 : 12;
    return (
      <>
        <circle cx={50} cy={50} r={ring + 5} fill="var(--color-pc-tile)" />
        <circle
          cx={50}
          cy={50}
          r={ring}
          fill="none"
          stroke="var(--color-pc-flow)"
          strokeWidth={conduit === "pipe" ? 4.5 : 5}
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
    const pad = radius * 2;
    return (
      <>
        <rect
          x={50 - radius - 2}
          y={50 - radius - 2}
          width={pad + 4}
          height={pad + 4}
          rx={3}
          fill={casing}
        />
        <rect
          x={50 - radius}
          y={50 - radius}
          width={pad}
          height={pad}
          rx={2}
          fill={bore}
          className={liveClass}
        />
        <rect
          x={50 - radius * 0.38}
          y={50 - radius * 0.38}
          width={radius * 0.76}
          height={radius * 0.76}
          fill={core}
          className={live ? "pc-core pc-core-live" : "pc-core"}
        />
      </>
    );
  }
  return <circle cx={50} cy={50} r={radius} fill={bore} className={liveClass} />;
}
