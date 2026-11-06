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
 * Pipe width in tile units. Every opening is a straight run through the
 * middle of an edge, extended across the gap so the neighbor's flat end
 * overlaps it. A corner is a quarter-circle whose tangents are perpendicular
 * to those edges, so the joint stays centered after the bend.
 */
const PIPE_WIDTH = 44;
const PIPE_RADIUS = PIPE_WIDTH / 2;
/** How far a butt end crosses into the neighboring tile, in tile units. */
const PIPE_STUB = 12;
/** Highlight stops just past the edge so the two stripes meet without stacking. */
const SHEEN_STUB = 6;
/** Bands stay inside the stroke: offset plus half the width is under the radius. */
const SHADE_OFFSET = 6;
const SHADE_WIDTH = 14;
const EDGE_OFFSET = 13;
const EDGE_WIDTH = 7;
const LIGHT_OFFSET = 5;
const LIGHT_WIDTH = 9;
const SPEC_OFFSET = 8;
const SPEC_WIDTH = 3;

type Pt = [number, number];

/** Screen-space light, swung back into this tile's unrotated drawing. */
function localLight(rotation: number): Pt {
  let x = -0.4;
  let y = -0.92;
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    const nextX = y;
    const nextY = -x;
    x = nextX;
    y = nextY;
  }
  return [x, y];
}

function pushLine(pts: Pt[], from: Pt, to: Pt, steps: number, skipStart: boolean) {
  for (let i = skipStart ? 1 : 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
  }
}

/**
 * Base shapes only. The board rotates the SVG, which matches the rules.
 * Straight is vertical, corner is north-east, tee is a vertical with an
 * east branch, cap points north.
 */
function centerlines(arms: DirId[]): Pt[][] {
  const has = (dir: DirId) => arms.includes(dir);
  const north: Pt = [50, -PIPE_STUB];
  const south: Pt = [50, 100 + PIPE_STUB];
  const east: Pt = [100 + PIPE_STUB, 50];
  const edgeN: Pt = [50, 0];
  const edgeE: Pt = [100, 50];
  const lines: Pt[][] = [];

  if (has("N") && has("S") && !has("E") && !has("W")) {
    const pts: Pt[] = [];
    pushLine(pts, north, south, 8, false);
    lines.push(pts);
    return lines;
  }

  if (has("N") && has("E") && !has("S") && !has("W")) {
    const pts: Pt[] = [];
    pushLine(pts, north, edgeN, 3, false);
    for (let i = 1; i <= 10; i++) {
      const angle = Math.PI - (Math.PI / 2) * (i / 10);
      pts.push([100 + 50 * Math.cos(angle), 50 * Math.sin(angle)]);
    }
    pushLine(pts, edgeE, east, 3, true);
    lines.push(pts);
    return lines;
  }

  if (has("N") && has("S")) {
    const pts: Pt[] = [];
    pushLine(pts, north, south, 8, false);
    lines.push(pts);
  } else if (has("N")) {
    const pts: Pt[] = [];
    pushLine(pts, [50, 50], north, 6, false);
    lines.push(pts);
  }
  if (has("E") && !(has("N") && has("E") && !has("S") && !has("W"))) {
    const pts: Pt[] = [];
    pushLine(pts, [50, 50], east, 6, false);
    lines.push(pts);
  }
  return lines;
}

function trimSheen(pts: Pt[]): Pt[] {
  return pts.filter(
    ([x, y]) => x >= -SHEEN_STUB && x <= 100 + SHEEN_STUB && y >= -SHEEN_STUB && y <= 100 + SHEEN_STUB,
  );
}

function offsetAlong(pts: Pt[], light: Pt, dist: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)]!;
    const next = pts[Math.min(pts.length - 1, i + 1)]!;
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const left: Pt = [-ty, tx];
    const right: Pt = [ty, -tx];
    const facing =
      left[0] * light[0] + left[1] * light[1] >= right[0] * light[0] + right[1] * light[1]
        ? left
        : right;
    out.push([pts[i]![0] + facing[0] * dist, pts[i]![1] + facing[1] * dist]);
  }
  return out;
}

function linePath(pts: Pt[]): string {
  return pts
    .map((pt, index) => `${index === 0 ? "M" : "L"}${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`)
    .join(" ");
}

/** Filled north-east-south tee. Butts stay centered on the three edge midpoints. */
function teeOutline(): string {
  const r = PIPE_RADIUS;
  const f = PIPE_RADIUS;
  const stub = PIPE_STUB;
  const left = 50 - r;
  const right = 50 + r;
  const top = 50 - r;
  const bottom = 50 + r;
  return [
    `M ${left} ${-stub}`,
    `L ${right} ${-stub}`,
    `L ${right} ${top + f}`,
    `A ${f} ${f} 0 0 1 ${right - f} ${top}`,
    `L ${100 + stub} ${top}`,
    `L ${100 + stub} ${bottom}`,
    `L ${right - f} ${bottom}`,
    `A ${f} ${f} 0 0 0 ${right} ${bottom - f}`,
    `L ${right} ${100 + stub}`,
    `L ${left} ${100 + stub}`,
    "Z",
  ].join(" ");
}

function cornerOutline(): string {
  return `M 50 ${-PIPE_STUB} L 50 0 A 50 50 0 0 0 100 50 L ${100 + PIPE_STUB} 50`;
}

function facingNormal(tx: number, ty: number, light: Pt): Pt {
  const len = Math.hypot(tx, ty) || 1;
  const left: Pt = [-ty / len, tx / len];
  const right: Pt = [ty / len, -tx / len];
  const leftDot = left[0] * light[0] + left[1] * light[1];
  const rightDot = right[0] * light[0] + right[1] * light[1];
  return leftDot >= rightDot ? left : right;
}

/** One smooth sheen around a north-east elbow, tangent to both openings. */
function cornerSheen(light: Pt, dist: number): string {
  const north = facingNormal(0, 1, light);
  const east = facingNormal(1, 0, light);
  const x = 50 + north[0] * dist;
  const y = 50 + east[1] * dist;
  return `M ${x.toFixed(2)} ${-SHEEN_STUB} L ${x.toFixed(2)} 0 Q ${x.toFixed(2)} ${y.toFixed(2)} 100 ${y.toFixed(2)} L ${100 + SHEEN_STUB} ${y.toFixed(2)}`;
}

/**
 * The bar keeps a straight light side and a straight dark side. The branch
 * sheen leaves the middle of the joint on a curve, so it does not end in a
 * square cut where it meets the bar.
 */
type SheenRole = "shade" | "edge" | "light" | "spec";

function teeSheens(light: Pt): { d: string; width: number; role: SheenRole }[] {
  const north = facingNormal(0, 1, light);
  const east = facingNormal(1, 0, light);
  const x = 50 + north[0] * LIGHT_OFFSET;
  const y = 50 + east[1] * LIGHT_OFFSET;
  const shadeX = 50 - north[0] * SHADE_OFFSET;
  const edgeX = 50 - north[0] * EDGE_OFFSET;
  const specX = 50 + north[0] * SPEC_OFFSET;
  const specY = 50 + east[1] * SPEC_OFFSET;
  return [
    {
      d: `M ${shadeX.toFixed(2)} ${-SHEEN_STUB} L ${shadeX.toFixed(2)} ${100 + SHEEN_STUB}`,
      width: SHADE_WIDTH,
      role: "shade",
    },
    {
      d: `M ${edgeX.toFixed(2)} ${-SHEEN_STUB} L ${edgeX.toFixed(2)} ${100 + SHEEN_STUB}`,
      width: EDGE_WIDTH,
      role: "edge",
    },
    {
      d: `M ${x.toFixed(2)} ${-SHEEN_STUB} L ${x.toFixed(2)} ${100 + SHEEN_STUB}`,
      width: LIGHT_WIDTH,
      role: "light",
    },
    {
      d: `M ${specX.toFixed(2)} ${-SHEEN_STUB} L ${specX.toFixed(2)} ${100 + SHEEN_STUB}`,
      width: SPEC_WIDTH,
      role: "spec",
    },
    {
      d: `M 50 50 Q 74 ${y.toFixed(2)} ${100 + SHEEN_STUB} ${y.toFixed(2)}`,
      width: LIGHT_WIDTH,
      role: "light",
    },
    {
      d: `M 50 50 Q 82 ${specY.toFixed(2)} ${100 + SHEEN_STUB} ${specY.toFixed(2)}`,
      width: SPEC_WIDTH,
      role: "spec",
    },
  ];
}

function CozyPipe({
  arms,
  rotation,
  live,
}: {
  arms: DirId[];
  rotation: number;
  live: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  if (arms.length === 0) return null;
  const has = (dir: DirId) => arms.includes(dir);
  const corner = has("N") && has("E") && !has("S") && !has("W");
  const tee = has("N") && has("E") && has("S") && !has("W");
  const straight = has("N") && has("S") && !has("E") && !has("W");
  const light = localLight(rotation);
  const lines = centerlines(arms).map(trimSheen);
  const cap = { fill: "none", strokeLinecap: "butt", strokeLinejoin: "round" } as const;
  const sheen = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const body =
    corner ? cornerOutline() : straight || arms.length === 1 ? linePath(centerlines(arms)[0] ?? []) : "";
  const capEnd = arms.length === 1;
  const band = (offset: number, width: number, role: SheenRole, towardLight: boolean) => {
    const normal: Pt = towardLight ? light : [-light[0], -light[1]];
    return corner
      ? [{ d: cornerSheen(normal, offset), width, role }]
      : lines.map((line) => ({
          d: linePath(offsetAlong(line, normal, offset)),
          width,
          role,
        }));
  };
  const strokes: { d: string; width: number; role: SheenRole }[] = tee
    ? teeSheens(light)
    : [
        ...band(SHADE_OFFSET, SHADE_WIDTH, "shade", false),
        ...band(EDGE_OFFSET, EDGE_WIDTH, "edge", false),
        ...band(LIGHT_OFFSET, LIGHT_WIDTH, "light", true),
        ...band(SPEC_OFFSET, SPEC_WIDTH, "spec", true),
      ];

  return (
    <svg viewBox="0 0 100 100" overflow="visible" className="h-full w-full" aria-hidden="true">
      <defs>
        <mask id={`${uid}-mask`}>
          {tee ? (
            <path d={teeOutline()} fill="white" />
          ) : (
            <path d={body} stroke="white" strokeWidth={PIPE_WIDTH} {...cap} />
          )}
          {capEnd && <circle cx="50" cy="50" r={PIPE_RADIUS} fill="white" />}
        </mask>
      </defs>
      {tee ? (
        <path d={teeOutline()} fill="var(--color-pc-casing)" />
      ) : (
        <path d={body} stroke="var(--color-pc-casing)" strokeWidth={PIPE_WIDTH} {...cap} />
      )}
      {capEnd && <circle cx="50" cy="50" r={PIPE_RADIUS} fill="var(--color-pc-casing)" />}
      <g mask={`url(#${uid}-mask)`}>
        {strokes.map((stroke, index) => (
          <path
            key={`sheen-${index}`}
            d={stroke.d}
            stroke={stroke.role === "light" || stroke.role === "spec" ? "var(--color-pc-pipe-light)" : "var(--color-pc-shade)"}
            strokeOpacity={stroke.role === "shade" ? 0.34 : stroke.role === "edge" ? 0.55 : stroke.role === "spec" ? 1 : 0.88}
            strokeWidth={stroke.width}
            {...sheen}
          />
        ))}
        {live &&
          lines.map((pts, index) => (
            <path
              key={`core-${index}`}
              d={linePath(pts)}
              stroke="var(--color-pc-spark)"
              strokeOpacity="0.8"
              strokeWidth="6"
              {...sheen}
            />
          ))}
      </g>
    </svg>
  );
}

export function TileArt({
  kind,
  conduit,
  live,
  hub,
  rotation = 0,
}: {
  kind: Kind;
  conduit: Conduit;
  live: boolean;
  hub: "start" | "end" | "plain";
  /** Clockwise quarter-turns already applied by the board, used only for lighting. */
  rotation?: number;
}) {
  const arms = openingIds(baseMask(kind));
  if (conduit === "pipe") return <CozyPipe arms={arms} rotation={rotation} live={live} />;
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
