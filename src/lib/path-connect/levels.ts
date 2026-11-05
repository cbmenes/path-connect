/**
 * Ten hand-authored wiring trees. Each route starts at the source and ends
 * at a node. Routes share a trunk, then split at tees. The builder fills the
 * rest of the 5×5 so those fillers do not link to the route, then turns
 * selected tiles clockwise. The source and the nodes can be among them.
 * A level is solvable because the solved board reaches every node, and it
 * starts unsolved.
 */

import type { ThemeId } from "./styles.ts";

import {
  DIRS,
  E,
  GRID_SIZE,
  N,
  S,
  W,
  type Cell,
  type Kind,
  type Role,
  baseMask,
  reachTargets,
  rotateMask,
} from "./logic.ts";

export interface TileModel {
  kind: Kind;
  solution: number;
  initial: number;
  role: Role;
  onRoute: boolean;
}

export interface Level {
  id: number;
  name: string;
  blurb: string;
  theme: ThemeId;
  tiles: TileModel[];
  /** Cells on the solved paths from the source to every node, nearest first. */
  solutionPath: number[];
}

type Coord = readonly [number, number];

interface LevelSpec {
  id: number;
  name: string;
  blurb: string;
  theme: ThemeId;
  /** Each route starts at the source and ends at one node. They share a first step. */
  routes: readonly (readonly Coord[])[];
  /** Extra clockwise quarter-turns, keyed "row,col". Omitted tiles stay solved. */
  scramble: Readonly<Record<string, number>>;
}

const SPECS: readonly LevelSpec[] = [
  {
    id: 1,
    name: "Porch light",
    blurb: "One light. The fixture and two wires are turned.",
    theme: "lights",
    routes: [[[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]],
    scramble: { "2,1": 1, "2,2": 1, "2,4": 3 },
  },
  {
    id: 2,
    name: "Two rooms",
    blurb: "Split the circuit. Both lights need power.",
    theme: "lights",
    routes: [
      [[2, 0], [2, 1], [2, 2], [1, 2], [1, 3]],
      [[2, 0], [2, 1], [2, 2], [3, 2], [3, 3]],
    ],
    scramble: { "2,1": 1, "2,2": 1, "1,3": 3, "3,3": 3 },
  },
  {
    id: 3,
    name: "Side lights",
    blurb: "Carry the wire across, then up and down.",
    theme: "lights",
    routes: [
      [[2, 0], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4]],
      [[2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [3, 4]],
    ],
    scramble: { "2,2": 1, "2,3": 1, "1,3": 1 },
  },
  {
    id: 4,
    name: "Long hall",
    blurb: "The far light is straight across. The near one drops off the hall.",
    theme: "lights",
    routes: [
      [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
      [[1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
    ],
    scramble: { "1,0": 3, "1,1": 1, "1,2": 1, "1,3": 1, "2,2": 1 },
  },
  {
    id: 5,
    name: "Three sensors",
    blurb: "One panel feeds three sensors.",
    theme: "alarm",
    routes: [
      [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
      [[3, 0], [3, 1], [2, 1], [1, 1], [0, 1]],
      [[3, 0], [3, 1], [2, 1], [2, 2], [2, 3]],
    ],
    scramble: { "3,0": 3, "3,1": 1, "3,2": 1, "2,1": 1, "1,1": 1, "2,2": 1 },
  },
  {
    id: 6,
    name: "Three doors",
    blurb: "The trunk splits twice. Arm all three sensors.",
    theme: "alarm",
    routes: [
      [[0, 2], [1, 2], [2, 2], [2, 3], [2, 4]],
      [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
      [[0, 2], [1, 2], [1, 1], [1, 0]],
    ],
    scramble: { "0,2": 3, "1,2": 1, "2,2": 1, "2,3": 1, "3,2": 1, "1,1": 1 },
  },
  {
    id: 7,
    name: "Stairwell",
    blurb: "Climb the left edge, then reach the two sensors on the right.",
    theme: "alarm",
    routes: [
      [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
      [[4, 0], [3, 0], [3, 1], [3, 2], [3, 3]],
      [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
    ],
    scramble: { "4,0": 3, "3,0": 1, "2,0": 1, "2,1": 1, "2,2": 1, "3,1": 1, "1,0": 1 },
  },
  {
    id: 8,
    name: "Four devices",
    blurb: "Four detectors. The paths fork above and below the trunk.",
    theme: "fire",
    routes: [
      [[4, 2], [3, 2], [2, 2], [2, 3], [2, 4]],
      [[4, 2], [3, 2], [2, 2], [1, 2], [0, 2]],
      [[4, 2], [3, 2], [2, 2], [1, 2], [1, 1], [1, 0]],
      [[4, 2], [3, 2], [2, 2], [2, 3], [3, 3], [3, 4]],
    ],
    scramble: {},
  },
  {
    id: 9,
    name: "Corridor",
    blurb: "Follow the top corridor, then the two drops.",
    theme: "fire",
    routes: [
      [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 3], [2, 4]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
      [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    ],
    scramble: {},
  },
  {
    id: 10,
    name: "Full wing",
    blurb: "Four detectors, and almost every wire starts turned.",
    theme: "fire",
    routes: [
      [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
      [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
    ],
    scramble: {},
  },
];

interface Shape {
  kind: Kind;
  rot: number;
  mask: number;
}

const SHAPES: Shape[] = [];
for (const kind of ["straight", "corner", "tee", "cap"] as const) {
  for (let rot = 0; rot < 4; rot++) {
    const mask = rotateMask(baseMask(kind), rot);
    if (!SHAPES.some((shape) => shape.kind === kind && shape.mask === mask)) {
      SHAPES.push({ kind, rot, mask });
    }
  }
}

function keyOf(row: number, col: number): string {
  return `${row},${col}`;
}

function popcount(mask: number): number {
  return [N, E, S, W].reduce((count, bit) => count + ((mask & bit) === 0 ? 0 : 1), 0);
}

function classify(mask: number): Shape {
  const shape =
    SHAPES.find((item) => item.mask === mask && item.kind !== "cap") ??
    SHAPES.find((item) => item.mask === mask);
  if (!shape) throw new Error(`No tile for openings ${mask}`);
  return shape;
}

function normalizeScramble(kind: Kind, amount: number): number {
  const turns = ((amount % 4) + 4) % 4;
  if (turns === 0) return 0;
  // A straight looks the same after a half turn, so a real scramble is one quarter turn.
  if (kind === "straight") return 1;
  return turns;
}

function assertOrthogonal(a: Coord, b: Coord, label: string) {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  if (dr + dc !== 1)
    throw new Error(`${label} steps from ${keyOf(a[0], a[1])} to ${keyOf(b[0], b[1])}`);
  if (a[0] < 0 || a[1] < 0 || a[0] >= GRID_SIZE || a[1] >= GRID_SIZE) {
    throw new Error(`${label} leaves the board at ${keyOf(a[0], a[1])}`);
  }
}

function link(masks: Map<string, number>, a: Coord, b: Coord) {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const dir = DIRS.find((item) => item.dr === dr && item.dc === dc);
  if (!dir) throw new Error("link is not orthogonal");
  const ak = keyOf(a[0], a[1]);
  const bk = keyOf(b[0], b[1]);
  masks.set(ak, (masks.get(ak) ?? 0) | dir.bit);
  masks.set(bk, (masks.get(bk) ?? 0) | dir.opposite);
}

/** Give a dead-end spur a second opening so it reads as a pipe, not a second source. */
function extendStubs(masks: Map<string, number>, route: Set<string>, terminals: Set<string>) {
  for (const [cellKey, mask] of [...masks]) {
    if (terminals.has(cellKey) || popcount(mask) !== 1) continue;
    const [row, col] = cellKey.split(",").map(Number) as [number, number];
    let best: (typeof DIRS)[number] | null = null;
    let bestScore = 99;
    for (const dir of DIRS) {
      if (mask & dir.bit) continue;
      const nr = row + dir.dr;
      const nc = col + dir.dc;
      const off = nr < 0 || nc < 0 || nr >= GRID_SIZE || nc >= GRID_SIZE;
      let score = 1;
      if (off) score = 0;
      else if (route.has(keyOf(nr, nc))) score = 2;
      const neighbor = off ? 0 : (masks.get(keyOf(nr, nc)) ?? 0);
      if (!off && neighbor & dir.opposite) continue;
      if (score < bestScore) {
        best = dir;
        bestScore = score;
      }
    }
    if (!best) throw new Error(`Nowhere to vent the spur at ${cellKey}`);
    masks.set(cellKey, mask | best.bit);
  }
}

function forbiddenAt(row: number, col: number, masks: Map<string, number>): number {
  let forbidden = 0;
  for (const dir of DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    if (nr < 0 || nc < 0 || nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
    const neighbor = masks.get(keyOf(nr, nc));
    if (neighbor == null) continue;
    if (neighbor & dir.opposite) forbidden |= dir.bit;
  }
  return forbidden;
}

function chooseFiller(forbidden: number, seed: number): Shape {
  const options = SHAPES.filter((shape) => shape.kind !== "cap" && (shape.mask & forbidden) === 0);
  if (options.length === 0) {
    const caps = SHAPES.filter((shape) => shape.kind === "cap" && (shape.mask & forbidden) === 0);
    if (caps.length === 0) throw new Error("No isolated filler");
    return caps[seed % caps.length]!;
  }
  return options[seed % options.length]!;
}

function autoScramble(onRoute: Map<string, Kind>, terminals: Set<string>, salt: number) {
  const scramble: Record<string, number> = {};
  let n = 0;
  const keys = [...onRoute.keys()].sort();
  for (const cellKey of keys) {
    if (terminals.has(cellKey)) {
      // One clockwise tap returns a cap to the solved opening.
      scramble[cellKey] = 3;
      continue;
    }
    const raw = ((n + salt) % 3) + 1;
    scramble[cellKey] = normalizeScramble(onRoute.get(cellKey)!, raw);
    n++;
  }
  return scramble;
}

function cellsOf(tiles: TileModel[], rotation: "solution" | "initial"): Cell[] {
  return tiles.map((tile) => ({
    kind: tile.kind,
    rotation: rotation === "solution" ? tile.solution : tile.initial,
    role: tile.role,
  }));
}

function spreadOrder(paths: readonly (readonly number[])[]): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const longest = Math.max(...paths.map((path) => path.length));
  for (let step = 0; step < longest; step++) {
    for (const path of paths) {
      const cell = path[step];
      if (cell === undefined || seen.has(cell)) continue;
      seen.add(cell);
      order.push(cell);
    }
  }
  return order;
}

function buildLevel(spec: LevelSpec, scrambleAll: boolean): Level {
  if (spec.routes.length === 0) throw new Error(`Level ${spec.id} has no nodes`);
  const source = spec.routes[0]![0]!;
  const masks = new Map<string, number>();
  const route = new Set<string>();
  const targetKeys = new Set<string>();

  for (const path of spec.routes) {
    if (path.length < 2) throw new Error(`Level ${spec.id} route is too short`);
    if (path[0]![0] !== source[0] || path[0]![1] !== source[1]) {
      throw new Error(`Level ${spec.id} route does not start at the source`);
    }
    const end = path.at(-1)!;
    const endKey = keyOf(end[0], end[1]);
    if (endKey === keyOf(source[0], source[1]) || targetKeys.has(endKey)) {
      throw new Error(`Level ${spec.id} repeats a node at ${endKey}`);
    }
    targetKeys.add(endKey);
    for (let index = 1; index < path.length; index++) {
      const prev = path[index - 1]!;
      const coord = path[index]!;
      assertOrthogonal(prev, coord, `Level ${spec.id} route`);
      const cellKey = keyOf(coord[0], coord[1]);
      if (targetKeys.has(cellKey) && cellKey !== endKey) {
        throw new Error(`Level ${spec.id} walks through a node at ${cellKey}`);
      }
      route.add(keyOf(prev[0], prev[1]));
      route.add(cellKey);
      link(masks, prev, coord);
    }
  }

  const startKey = keyOf(source[0], source[1]);
  const terminals = new Set([startKey, ...targetKeys]);
  extendStubs(masks, route, terminals);

  for (const cellKey of terminals) {
    if (popcount(masks.get(cellKey) ?? 0) !== 1) {
      throw new Error(`Level ${spec.id} terminal ${cellKey} should have one opening`);
    }
  }

  const kinds = new Map<string, Kind>();
  for (const [cellKey, mask] of masks) {
    if (popcount(mask) > 3) throw new Error(`Level ${spec.id} has a cross at ${cellKey}`);
    kinds.set(cellKey, classify(mask).kind);
  }

  const scramble = scrambleAll
    ? autoScramble(kinds, terminals, spec.id * 3)
    : Object.fromEntries(
        Object.entries(spec.scramble).map(([cellKey, amount]) => {
          const kind = kinds.get(cellKey);
          if (!kind) throw new Error(`Level ${spec.id} scrambles empty cell ${cellKey}`);
          return [cellKey, normalizeScramble(kind, amount)];
        }),
      );

  const tiles: TileModel[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellKey = keyOf(row, col);
      const onRoute = masks.has(cellKey);
      const shape = onRoute
        ? classify(masks.get(cellKey)!)
        : chooseFiller(forbiddenAt(row, col, masks), row * 5 + col + spec.id * 17);
      if (!onRoute) masks.set(cellKey, shape.mask);
      const role: Role = cellKey === startKey ? "start" : targetKeys.has(cellKey) ? "end" : "play";
      const solution = shape.rot;
      const initial = (solution + (scramble[cellKey] ?? 0)) % 4;
      tiles.push({ kind: shape.kind, solution, initial, role, onRoute });
    }
  }

  // A scrambled opening can bridge through fillers. Turn fillers until a
  // node is still dark, without touching the solved route.
  let guard = 0;
  while (reachTargets(cellsOf(tiles, "initial")).complete && guard < 80) {
    const filler = tiles.filter((tile) => !tile.onRoute);
    const tile = filler[guard % filler.length];
    if (!tile) throw new Error(`Level ${spec.id} has no filler to break a shortcut`);
    tile.initial = (tile.initial + 1) % 4;
    guard++;
  }
  if (reachTargets(cellsOf(tiles, "initial")).complete) {
    throw new Error(`Level ${spec.id} is already solved`);
  }

  const solved = reachTargets(cellsOf(tiles, "solution"));
  if (!solved.complete || solved.paths.length !== targetKeys.size) {
    throw new Error(`Level ${spec.id} does not power every node`);
  }
  const solutionPath = spreadOrder(solved.paths);

  return {
    id: spec.id,
    name: spec.name,
    blurb: spec.blurb,
    theme: spec.theme,
    tiles,
    solutionPath,
  };
}

const FULL_SCRAMBLE = new Set([8, 9, 10]);

export const LEVELS: readonly Level[] = SPECS.map((spec) =>
  buildLevel(spec, FULL_SCRAMBLE.has(spec.id)),
);

export function boardCells(level: Level, spins: readonly number[]): Cell[] {
  return level.tiles.map((tile, index) => ({
    kind: tile.kind,
    rotation: (((spins[index] ?? tile.initial) % 4) + 4) % 4,
    role: tile.role,
  }));
}
