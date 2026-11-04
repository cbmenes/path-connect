/**
 * Ten hand-authored routes. Each spec is a polyline from source to outlet,
 * plus optional dead-end spurs that turn a tile into a tee. The builder
 * fills the rest of the 5×5 so those fillers do not link to the route, then
 * turns selected tiles clockwise. A level is solvable because the unturned
 * board connects, and every turned tile can be clicked back.
 *
 * Add a level by appending a spec. `levels.test.ts` rejects a board that
 * starts connected, a solution that does not match its path, or a route
 * that steps on itself.
 */

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
  findPath,
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
  tiles: TileModel[];
  /** Cell indexes of the authored source-to-outlet route, spurs excluded. */
  solutionPath: number[];
}

type Coord = readonly [number, number];

interface LevelSpec {
  id: number;
  name: string;
  blurb: string;
  path: readonly Coord[];
  spurs?: readonly (readonly Coord[])[];
  /** Extra clockwise quarter-turns, keyed "row,col". Omitted tiles stay solved. */
  scramble: Readonly<Record<string, number>>;
}

const SPECS: readonly LevelSpec[] = [
  {
    id: 1,
    name: "First flow",
    blurb: "Two tiles are turned. Line them up.",
    path: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    scramble: { "2,1": 1, "2,2": 1 },
  },
  {
    id: 2,
    name: "Elbow",
    blurb: "One bend, then across to the outlet.",
    path: [
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    scramble: { "2,2": 1, "3,2": 1, "4,2": 1 },
  },
  {
    id: 3,
    name: "U-turn",
    blurb: "Across, down, and back.",
    path: [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 2],
      [3, 1],
    ],
    scramble: { "1,2": 1, "1,3": 1, "3,2": 1 },
  },
  {
    id: 4,
    name: "Switchback",
    blurb: "Follow the S from the source down to the outlet.",
    path: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [2, 2],
      [2, 1],
      [3, 1],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    scramble: { "0,2": 1, "0,3": 1, "1,3": 1, "2,3": 1, "2,2": 1, "2,1": 1 },
  },
  {
    id: 5,
    name: "Junction",
    blurb: "The main line passes through a tee.",
    path: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    spurs: [
      [
        [2, 2],
        [3, 2],
        [4, 2],
      ],
    ],
    scramble: { "2,1": 1, "2,2": 1, "2,3": 1, "3,2": 1 },
  },
  {
    id: 6,
    name: "Branch line",
    blurb: "The tee is where the path turns. A spur runs off it.",
    path: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [3, 4],
    ],
    spurs: [
      [
        [1, 2],
        [0, 2],
      ],
    ],
    scramble: { "1,1": 1, "1,2": 1, "2,2": 1, "3,2": 2, "3,3": 1 },
  },
  {
    id: 7,
    name: "Long run",
    blurb: "Four corners. Keep the openings facing.",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 4],
      [2, 4],
      [2, 3],
      [2, 2],
      [2, 1],
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    spurs: [
      [
        [0, 2],
        [1, 2],
      ],
    ],
    scramble: {
      "0,1": 1,
      "0,3": 1,
      "0,4": 1,
      "2,4": 1,
      "2,2": 1,
      "2,0": 1,
      "4,0": 1,
      "4,2": 1,
      "1,2": 1,
    },
  },
  {
    id: 8,
    name: "Two junctions",
    blurb: "Two tees sit on the route. Each has a side spur.",
    path: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [2, 2],
      [2, 1],
      [3, 1],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    spurs: [
      [
        [0, 3],
        [0, 4],
      ],
      [
        [2, 1],
        [2, 0],
      ],
    ],
    scramble: {},
  },
  {
    id: 9,
    name: "Inward",
    blurb: "A long loop that finishes inside the grid.",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [4, 3],
      [4, 2],
      [4, 1],
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 2],
    ],
    spurs: [
      [
        [2, 0],
        [2, 1],
      ],
      [
        [3, 0],
        [3, 1],
      ],
    ],
    scramble: {},
  },
  {
    id: 10,
    name: "Full circuit",
    blurb: "Corners and tees, almost nothing left in place.",
    path: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [3, 1],
      [2, 1],
      [1, 1],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [4, 3],
      [3, 3],
      [2, 3],
    ],
    spurs: [
      [
        [3, 3],
        [3, 4],
        [4, 4],
      ],
      [
        [1, 2],
        [1, 3],
        [1, 4],
      ],
      [
        [0, 2],
        [0, 3],
        [0, 4],
      ],
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
    if (terminals.has(cellKey)) continue;
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

function buildLevel(spec: LevelSpec, scrambleAll: boolean): Level {
  const masks = new Map<string, number>();
  const route = new Set<string>();
  spec.path.forEach((coord, index) => {
    if (route.has(keyOf(coord[0], coord[1]))) {
      throw new Error(`Level ${spec.id} repeats ${keyOf(coord[0], coord[1])}`);
    }
    route.add(keyOf(coord[0], coord[1]));
    if (index > 0) {
      assertOrthogonal(spec.path[index - 1]!, coord, `Level ${spec.id} path`);
      link(masks, spec.path[index - 1]!, coord);
    }
  });

  for (const spur of spec.spurs ?? []) {
    if (spur.length < 2) throw new Error(`Level ${spec.id} spur is too short`);
    if (!route.has(keyOf(spur[0][0], spur[0][1]))) {
      throw new Error(`Level ${spec.id} spur does not start on the route`);
    }
    for (let i = 1; i < spur.length; i++) {
      assertOrthogonal(spur[i - 1]!, spur[i]!, `Level ${spec.id} spur`);
      const cellKey = keyOf(spur[i]![0], spur[i]![1]);
      if (route.has(cellKey)) throw new Error(`Level ${spec.id} spur hits the route at ${cellKey}`);
      route.add(cellKey);
      link(masks, spur[i - 1]!, spur[i]!);
    }
  }

  const startKey = keyOf(spec.path[0]![0], spec.path[0]![1]);
  const endKey = keyOf(spec.path.at(-1)![0], spec.path.at(-1)![1]);
  const terminals = new Set([startKey, endKey]);
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
      const role: Role = cellKey === startKey ? "start" : cellKey === endKey ? "end" : "play";
      const solution = shape.rot;
      const initial = role === "play" ? (solution + (scramble[cellKey] ?? 0)) % 4 : solution;
      tiles.push({ kind: shape.kind, solution, initial, role, onRoute });
    }
  }

  // A scrambled opening can bridge through fillers. Turn fillers until the
  // starting board is sealed, without touching the solved route.
  let guard = 0;
  while (findPath(cellsOf(tiles, "initial")) && guard < 80) {
    const filler = tiles.filter((tile) => !tile.onRoute);
    const tile = filler[guard % filler.length];
    if (!tile) throw new Error(`Level ${spec.id} has no filler to break a shortcut`);
    tile.initial = (tile.initial + 1) % 4;
    guard++;
  }
  if (findPath(cellsOf(tiles, "initial"))) {
    throw new Error(`Level ${spec.id} is already solved`);
  }

  const solved = findPath(cellsOf(tiles, "solution"));
  const solutionPath = spec.path.map(([row, col]) => row * GRID_SIZE + col);
  if (!solved || solved.join(",") !== solutionPath.join(",")) {
    throw new Error(
      `Level ${spec.id} solution path is ${solved?.join("-") ?? "missing"}, expected ${solutionPath.join("-")}`,
    );
  }

  return { id: spec.id, name: spec.name, blurb: spec.blurb, tiles, solutionPath };
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
