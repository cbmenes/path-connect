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
 * Cozy conduit, in tile units. Every arm runs straight through the middle of
 * its edge and continues `PIPE_STUB` into the gap, so a neighbor's flat end
 * lands on the same line. Corners bend near the center with a tight radius;
 * both tangents are perpendicular to the edges, so openings never shift.
 */
const PIPE_WIDTH = 24;
const PIPE_STUB = 12;
const BEND_RADIUS = 22;
/** Collar sits just inside each opening, like a fitting on real conduit. */
const COLLAR_FROM = 1.5;
const COLLAR_TO = 6.5;

/**
 * Layers of the tube, darkest first. `shift` moves a layer toward the light,
 * as a fraction of the pipe width; every layer stays inside the outer rim.
 */
const LAYERS: { width: number; shift: number; ink: "shade" | "light"; mix: number; opacity?: number }[] = [
  { width: 1, shift: 0, ink: "shade", mix: 66 },
  { width: 0.8, shift: 0.07, ink: "shade", mix: 26 },
  { width: 0.44, shift: 0.15, ink: "light", mix: 26, opacity: 0.9 },
  { width: 0.14, shift: 0.24, ink: "light", mix: 92, opacity: 0.95 },
];

type Pt = [number, number];

/** Screen-space light from the upper left, swung back into this tile's unrotated drawing. */
function localLight(rotation: number): Pt {
  let x = -Math.SQRT1_2;
  let y = -Math.SQRT1_2;
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    const nextX = y;
    const nextY = -x;
    x = nextX;
    y = nextY;
  }
  return [x, y];
}

function segment(from: Pt, to: Pt, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
  }
  return pts;
}

/** North arm into a tight bend, then out the east edge. */
function elbow(): Pt[] {
  const r = BEND_RADIUS;
  const pts = segment([50, -PIPE_STUB], [50, 50 - r], 6);
  for (let i = 1; i < 24; i++) {
    const angle = Math.PI - (Math.PI / 2) * (i / 24);
    pts.push([50 + r + r * Math.cos(angle), 50 - r + r * Math.sin(angle)]);
  }
  return pts.concat(segment([50 + r, 50], [100 + PIPE_STUB, 50], 6));
}

interface Run {
  pts: Pt[];
  /** Round the start of the run, for a pipe that stops in the middle of the tile. */
  roundStart?: boolean;
  /** Light layers begin this far along, so a tee branch does not paint over the bar's highlight. */
  lightFrom?: number;
}

/** Base shapes, drawn at rotation 0. Straight is vertical, corner is NE, tee is NES, cap points north. */
function runs(arms: DirId[]): Run[] {
  const has = (dir: DirId) => arms.includes(dir);
  if (has("N") && has("E") && !has("S")) return [{ pts: elbow() }];
  const out: Run[] = [];
  if (has("N") && has("S")) out.push({ pts: segment([50, -PIPE_STUB], [50, 100 + PIPE_STUB], 12) });
  else if (has("N")) out.push({ pts: segment([50, 50], [50, -PIPE_STUB], 8), roundStart: true });
  if (has("E")) out.push({ pts: segment([50, 50], [100 + PIPE_STUB, 50], 8), lightFrom: PIPE_WIDTH / 2 });
  return out;
}

/**
 * Pushes each point toward the light by the component of the light across the
 * pipe. Through a bend the band glides smoothly from one side to the other, and
 * two neighboring tiles agree on where it sits.
 */
function shifted(pts: Pt[], light: Pt, dist: number): Pt[] {
  return pts.map((pt, i) => {
    const prev = pts[Math.max(0, i - 1)]!;
    const next = pts[Math.min(pts.length - 1, i + 1)]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const k = (dist * (nx * light[0] + ny * light[1])) / Math.SQRT1_2;
    const clamped = Math.max(-dist, Math.min(dist, k));
    return [pt[0] + nx * clamped, pt[1] + ny * clamped];
  });
}

function trimStart(pts: Pt[], from: number): Pt[] {
  if (!from) return pts;
  const origin = pts[0]!;
  return pts.filter((pt) => Math.hypot(pt[0] - origin[0], pt[1] - origin[1]) >= from);
}

function linePath(pts: Pt[]): string {
  return pts
    .map((pt, index) => `${index === 0 ? "M" : "L"}${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`)
    .join(" ");
}

function layerColor(layer: (typeof LAYERS)[number]): string {
  const ink = layer.ink === "shade" ? "var(--color-pc-shade)" : "var(--color-pc-pipe-light)";
  return `color-mix(in oklab, ${ink} ${layer.mix}%, var(--color-pc-casing))`;
}

/** Short fittings just inside each opening. */
function collars(arms: DirId[]): Pt[][] {
  const at: Record<string, [Pt, Pt]> = {
    N: [[50, COLLAR_FROM], [50, COLLAR_TO]],
    E: [[100 - COLLAR_FROM, 50], [100 - COLLAR_TO, 50]],
    S: [[50, 100 - COLLAR_FROM], [50, 100 - COLLAR_TO]],
  };
  return arms.filter((dir) => at[dir]).map((dir) => segment(at[dir]![0], at[dir]![1], 2));
}

function CozyPipe({
  arms,
  rotation,
  live,
  gauge,
}: {
  arms: DirId[];
  rotation: number;
  live: boolean;
  gauge: number;
}) {
  const pipeWidth = PIPE_WIDTH * gauge;
  if (arms.length === 0) return null;
  const light = localLight(rotation);
  const pieces = runs(arms);
  const butt = { fill: "none", strokeLinecap: "butt", strokeLinejoin: "round" } as const;
  const strokes: { key: string; d: string; width: number; color: string; opacity: number }[] = [];
  const dots: { key: string; x: number; y: number; r: number; color: string; opacity: number }[] = [];

  LAYERS.forEach((layer, li) => {
    const width = layer.width * pipeWidth;
    const dist = layer.shift * pipeWidth;
    const color = layerColor(layer);
    const opacity = layer.opacity ?? 1;
    const isLight = layer.ink === "light";
    pieces.forEach((run, ri) => {
      const pts = isLight ? trimStart(run.pts, run.lightFrom ?? 0) : run.pts;
      if (pts.length < 2) return;
      const line = shifted(pts, light, dist);
      strokes.push({ key: `l${li}-r${ri}`, d: linePath(line), width, color, opacity });
      if (run.roundStart) {
        dots.push({ key: `d${li}-r${ri}`, x: line[0]![0], y: line[0]![1], r: width / 2, color, opacity });
      }
    });
  });

  const fittings = collars(arms);

  return (
    <svg viewBox="0 0 100 100" overflow="visible" className="h-full w-full" aria-hidden="true">
      {LAYERS.map((_, li) => (
        <g key={`layer-${li}`}>
          {dots
            .filter((dot) => dot.key.startsWith(`d${li}-`))
            .map((dot) => (
              <circle key={dot.key} cx={dot.x} cy={dot.y} r={dot.r} fill={dot.color} fillOpacity={dot.opacity} />
            ))}
          {strokes
            .filter((stroke) => stroke.key.startsWith(`l${li}-`))
            .map((stroke) => (
              <path
                key={stroke.key}
                d={stroke.d}
                stroke={stroke.color}
                strokeOpacity={stroke.opacity}
                strokeWidth={stroke.width}
                {...butt}
              />
            ))}
        </g>
      ))}
      {fittings.map((pts, fi) => (
        <g key={`collar-${fi}`}>
          <path d={linePath(pts)} stroke={layerColor(LAYERS[0]!)} strokeWidth={pipeWidth + 3} {...butt} />
          <path
            d={linePath(shifted(pts, light, pipeWidth * 0.07))}
            stroke={layerColor(LAYERS[1]!)}
            strokeWidth={pipeWidth * 0.86}
            {...butt}
          />
          <path
            d={linePath(shifted(pts, light, pipeWidth * 0.2))}
            stroke={layerColor(LAYERS[2]!)}
            strokeOpacity="0.9"
            strokeWidth={pipeWidth * 0.36}
            {...butt}
          />
        </g>
      ))}
      {live &&
        pieces.map((run, ri) => (
          <path
            key={`live-${ri}`}
            d={linePath(shifted(run.pts, light, pipeWidth * 0.15))}
            stroke="var(--color-pc-spark)"
            strokeOpacity="0.55"
            strokeWidth={pipeWidth * 0.3}
            {...butt}
          />
        ))}
    </svg>
  );
}

export function TileArt({
  kind,
  conduit,
  live,
  hub,
  rotation = 0,
  gauge = 1,
}: {
  kind: Kind;
  conduit: Conduit;
  live: boolean;
  hub: "start" | "end" | "plain";
  /** Clockwise quarter-turns already applied by the board, used only for lighting. */
  rotation?: number;
  /** Pipe thickness relative to the standard cozy pipe. Openings stay where they are. */
  gauge?: number;
}) {
  const arms = openingIds(baseMask(kind));
  if (conduit === "pipe") return <CozyPipe arms={arms} rotation={rotation} live={live} gauge={gauge} />;
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
