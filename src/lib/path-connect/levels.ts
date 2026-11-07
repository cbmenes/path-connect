/**
 * The campaign. Each level is a wiring tree: every route starts at the
 * source and ends at a node, and routes share a trunk before they split at
 * tees. The builder fills the rest of the board so those fillers do not link
 * to the route, then turns selected tiles clockwise. The source and the nodes
 * can be among them. A level is solvable because the solved board reaches
 * every node, and it starts unsolved.
 *
 * Progression:
 * - 1–12 House Lights on 5×5. Short, clear routes that teach the mechanic.
 * - 13–22 Building Alarm on 5×5. Longer routes and more sensors.
 * - 23–32 School Fire Alarm on 5×5. About the same difficulty.
 * - 33–46 rotate the themes on 6×6. Bolted tiles appear from level 37.
 * - 47–60 rotate the themes on 7×7 with more nodes and bolted tiles.
 *
 * Hand-built levels keep their exact boards. Later levels come from a seeded
 * tree generator, so every player gets the same boards.
 */

import type { ThemeId } from "./styles.ts";
import { themeById } from "./styles.ts";

import {
  DIRS,
  GRID_SIZE,
  N,
  E,
  S,
  W,
  type Cell,
  type Kind,
  type Role,
  baseMask,
  reachTargets,
  rotateMask,
  sameOpenings,
} from "./logic.ts";
import { mulberry32 } from "./random.ts";

export interface TileModel {
  kind: Kind;
  solution: number;
  initial: number;
  role: Role;
  onRoute: boolean;
  /** Bolted in place at its solved facing. Taps do not turn it. */
  fixed: boolean;
}

export interface Level {
  id: number;
  name: string;
  blurb: string;
  theme: ThemeId;
  /** Board side length. */
  size: number;
  /** What this level opens, such as a new system or board size. Shown as a small "New" label. */
  unlock?: string;
  tiles: TileModel[];
  /** Cells on the solved paths from the source to every node, nearest first. */
  solutionPath: number[];
  /** Fewest taps that solve the board from its starting turns. */
  par: number;
}

export interface Chapter {
  title: string;
  from: number;
  to: number;
  /** One line under the chapter title in the level picker. */
  note: string;
}

type Coord = readonly [number, number];

/** Turn every route tile, or a share of them picked from the seed. */
type Scramble = Readonly<Record<string, number>> | "all" | { share: number };

interface LevelSpec {
  id: number;
  name: string;
  blurb: string;
  theme: ThemeId;
  size?: number;
  unlock?: string;
  /** Feeds the filler and scramble choices. Defaults to `id`, so moved levels can keep their board. */
  seed?: number;
  /** Each route starts at the source and ends at one node. They share a first step. */
  routes: readonly (readonly Coord[])[];
  /** Extra clockwise quarter-turns keyed "row,col". Omitted tiles stay solved. */
  scramble: Scramble;
  /** Route tiles to bolt at their solved facing. */
  fixed?: number;
}

const PORCH: LevelSpec["routes"] = [[[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]];
const TWO_ROOMS: LevelSpec["routes"] = [
  [[2, 0], [2, 1], [2, 2], [1, 2], [1, 3]],
  [[2, 0], [2, 1], [2, 2], [3, 2], [3, 3]],
];
const SIDE_LIGHTS: LevelSpec["routes"] = [
  [[2, 0], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4]],
  [[2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [3, 4]],
];
const FRONT_DESK: LevelSpec["routes"] = [
  [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
  [[1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
];
const THREE_SENSORS: LevelSpec["routes"] = [
  [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
  [[3, 0], [3, 1], [2, 1], [1, 1], [0, 1]],
  [[3, 0], [3, 1], [2, 1], [2, 2], [2, 3]],
];
const THREE_DOORS: LevelSpec["routes"] = [
  [[0, 2], [1, 2], [2, 2], [2, 3], [2, 4]],
  [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
  [[0, 2], [1, 2], [1, 1], [1, 0]],
];
const WEST_STAIRS: LevelSpec["routes"] = [
  [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
  [[4, 0], [3, 0], [3, 1], [3, 2], [3, 3]],
  [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
];
const FOUR_DEVICES: LevelSpec["routes"] = [
  [[4, 2], [3, 2], [2, 2], [2, 3], [2, 4]],
  [[4, 2], [3, 2], [2, 2], [1, 2], [0, 2]],
  [[4, 2], [3, 2], [2, 2], [1, 2], [1, 1], [1, 0]],
  [[4, 2], [3, 2], [2, 2], [2, 3], [3, 3], [3, 4]],
];
const CORRIDOR: LevelSpec["routes"] = [
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 3], [2, 4]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
];
const FULL_WING: LevelSpec["routes"] = [
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

/** The ten original boards, with their original numbers and systems. Daily draws from these. */
const CLASSIC_SPECS: readonly LevelSpec[] = [
  {
    id: 1,
    name: "Porch light",
    blurb: "One light. The fixture and two pipes are turned.",
    theme: "lights",
    routes: PORCH,
    scramble: { "2,1": 1, "2,2": 1, "2,4": 3 },
  },
  {
    id: 2,
    name: "Two rooms",
    blurb: "Split the circuit. Both lights need power.",
    theme: "lights",
    routes: TWO_ROOMS,
    scramble: { "2,1": 1, "2,2": 1, "1,3": 3, "3,3": 3 },
  },
  {
    id: 3,
    name: "Side lights",
    blurb: "Carry the pipe across, then up and down.",
    theme: "lights",
    routes: SIDE_LIGHTS,
    scramble: { "2,2": 1, "2,3": 1, "1,3": 1 },
  },
  {
    id: 4,
    name: "Front desk",
    blurb: "Two sensors. The panel and the run across the lobby start turned.",
    theme: "alarm",
    routes: FRONT_DESK,
    scramble: { "1,0": 3, "1,1": 1, "1,2": 1, "1,3": 1, "2,2": 1 },
  },
  {
    id: 5,
    name: "Three sensors",
    blurb: "One panel feeds three sensors.",
    theme: "alarm",
    routes: THREE_SENSORS,
    scramble: { "3,0": 3, "3,1": 1, "3,2": 1, "2,1": 1, "1,1": 1, "2,2": 1 },
  },
  {
    id: 6,
    name: "Three doors",
    blurb: "The trunk splits twice. Arm all three sensors.",
    theme: "alarm",
    routes: THREE_DOORS,
    scramble: { "0,2": 3, "1,2": 1, "2,2": 1, "2,3": 1, "3,2": 1, "1,1": 1 },
  },
  {
    id: 7,
    name: "West stairs",
    blurb: "Climb the stairwell, then reach the detectors on the right.",
    theme: "fire",
    routes: WEST_STAIRS,
    scramble: { "4,0": 3, "3,0": 1, "2,0": 1, "2,1": 1, "2,2": 1, "3,1": 1, "1,0": 1 },
  },
  {
    id: 8,
    name: "Four devices",
    blurb: "Four detectors. The paths fork above and below the trunk.",
    theme: "fire",
    routes: FOUR_DEVICES,
    scramble: "all",
  },
  {
    id: 9,
    name: "Corridor",
    blurb: "Follow the top corridor, then the two drops.",
    theme: "fire",
    routes: CORRIDOR,
    scramble: "all",
  },
  {
    id: 10,
    name: "Full wing",
    blurb: "Four detectors, and almost every pipe starts turned.",
    theme: "fire",
    routes: FULL_WING,
    scramble: "all",
  },
];

function moved(classicId: number, id: number, extra: Partial<LevelSpec> = {}): LevelSpec {
  const spec = CLASSIC_SPECS[classicId - 1]!;
  return { ...spec, id, seed: classicId, ...extra };
}

/** House Lights. Each level adds one idea: a bend, a tee, a turned source, then a third light. */
const HOUSE_SPECS: readonly LevelSpec[] = [
  CLASSIC_SPECS[0]!,
  CLASSIC_SPECS[1]!,
  CLASSIC_SPECS[2]!,
  {
    id: 4,
    name: "Hall bend",
    blurb: "The pipe turns two corners on the way to the light.",
    theme: "lights",
    routes: [[[1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4]]],
    scramble: { "1,2": 3, "2,2": 1, "3,2": 3, "3,4": 3 },
  },
  {
    id: 5,
    name: "Kitchen",
    blurb: "A tee near the breaker feeds two lights.",
    theme: "lights",
    routes: [
      [[3, 0], [3, 1], [3, 2], [3, 3]],
      [[3, 0], [3, 1], [2, 1], [1, 1], [1, 2]],
    ],
    scramble: { "3,1": 3, "2,1": 1, "1,2": 3, "3,3": 3 },
  },
  {
    id: 6,
    name: "Stair light",
    blurb: "Step the pipe up the stairs, one corner at a time.",
    theme: "lights",
    routes: [[[4, 0], [4, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4]]],
    scramble: { "4,1": 3, "3,1": 3, "3,2": 2, "2,3": 3, "1,4": 3 },
  },
  {
    id: 7,
    name: "Twin lamps",
    blurb: "The breaker starts turned. Face it down, then split left and right.",
    theme: "lights",
    routes: [
      [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0]],
      [[0, 2], [1, 2], [2, 2], [2, 3], [2, 4]],
    ],
    scramble: { "0,2": 3, "1,2": 1, "2,2": 2, "2,1": 1, "2,4": 3 },
  },
  {
    id: 8,
    name: "Three rooms",
    blurb: "Three lights now. Two tees share the hallway.",
    theme: "lights",
    routes: [
      [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
      [[2, 0], [2, 1], [1, 1], [1, 2], [1, 3]],
      [[2, 0], [2, 1], [2, 2], [3, 2], [3, 3]],
    ],
    scramble: { "2,1": 3, "1,1": 3, "1,2": 1, "2,2": 3, "3,2": 3, "2,4": 3, "3,3": 3 },
  },
  {
    id: 9,
    name: "Upstairs",
    blurb: "One riser feeds three lights on the landing.",
    theme: "lights",
    routes: [
      [[4, 2], [3, 2], [2, 2], [1, 2], [0, 2]],
      [[4, 2], [3, 2], [3, 1], [2, 1], [2, 0]],
      [[4, 2], [3, 2], [2, 2], [2, 3], [2, 4]],
    ],
    scramble: { "4,2": 3, "3,2": 2, "3,1": 3, "2,1": 3, "2,2": 3, "1,2": 1, "2,3": 1, "2,4": 3 },
  },
  {
    id: 10,
    name: "Night lights",
    blurb: "Longer runs. Trace each light back to the breaker.",
    theme: "lights",
    routes: [
      [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [1, 4]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [4, 2]],
    ],
    scramble: { share: 0.55 },
  },
  {
    id: 11,
    name: "Back yard",
    blurb: "Three lights at the ends of three long runs.",
    theme: "lights",
    routes: [
      [[4, 0], [4, 1], [4, 2], [4, 3], [3, 3], [2, 3], [2, 4]],
      [[4, 0], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [0, 2]],
      [[4, 0], [4, 1], [3, 1], [2, 1], [2, 0]],
    ],
    scramble: { share: 0.6 },
  },
  {
    id: 12,
    name: "Whole house",
    blurb: "Four lights, one in each corner room. Light the whole house.",
    theme: "lights",
    routes: [
      [[0, 2], [1, 2], [1, 1], [1, 0]],
      [[0, 2], [1, 2], [1, 3], [1, 4]],
      [[0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [3, 0]],
      [[0, 2], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4]],
    ],
    scramble: { share: 0.65 },
  },
];

interface Plan {
  id: number;
  theme: ThemeId;
  size: number;
  nodes: number;
  /** Cells each new branch walks, inclusive range. */
  reach: readonly [number, number];
  /** Chance a walk turns a corner instead of running straight. */
  wiggle: number;
  share: number;
  fixed: number;
  unlock?: string;
  blurb?: string;
}

const NAMES: Record<ThemeId, readonly string[]> = {
  lights: [
    "Guest house",
    "Garden shed",
    "Attic",
    "Basement",
    "Sunroom",
    "Garage",
    "Back porch",
    "Workshop",
    "Loft",
    "Cellar",
  ],
  alarm: [
    "Mail room",
    "Server closet",
    "Loading dock",
    "Stairwell B",
    "Conference wing",
    "Night shift",
    "Top floor",
    "Records room",
    "Parking deck",
    "Roof access",
    "East tower",
    "Vault",
    "Data hall",
    "Penthouse",
    "Atrium",
    "Control room",
    "Lobby annex",
  ],
  fire: [
    "Art room",
    "Gym",
    "Library",
    "Cafeteria",
    "Science lab",
    "Main hall",
    "Music room",
    "Auditorium",
    "Bus bay",
    "Nurse's office",
    "North wing",
    "Locker hall",
    "Theater",
    "Field house",
    "Band room",
    "Front office",
  ],
};

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function rotatingTheme(id: number): ThemeId {
  const order: readonly ThemeId[] = ["lights", "alarm", "fire"];
  return order[(id - 33) % 3]!;
}

/** Difficulty for a generated level. Each knob rises slowly inside its stretch. */
function planFor(id: number): Plan {
  if (id <= 22) {
    const t = (id - 16) / 6;
    return {
      id,
      theme: "alarm",
      size: 5,
      nodes: [3, 3, 4, 3, 4, 4, 4][id - 16]!,
      reach: [2, 4],
      wiggle: lerp(0.3, 0.5, t),
      share: lerp(0.65, 0.9, t),
      fixed: 0,
    };
  }
  if (id <= 32) {
    const t = (id - 27) / 5;
    return {
      id,
      theme: "fire",
      size: 5,
      nodes: [4, 4, 4, 5, 4, 5][id - 27]!,
      reach: [2, 4],
      wiggle: lerp(0.4, 0.55, t),
      share: lerp(0.8, 1, t),
      fixed: 0,
    };
  }
  if (id <= 36) {
    return {
      id,
      theme: rotatingTheme(id),
      size: 6,
      nodes: [4, 4, 5, 5][id - 33]!,
      reach: [3, 5],
      wiggle: 0.45,
      share: 0.85,
      fixed: 0,
      unlock: id === 33 ? "6×6 board" : undefined,
      blurb: id === 33 ? "A wider 6×6 board. Same rules, longer runs." : undefined,
    };
  }
  if (id <= 46) {
    const t = (id - 37) / 9;
    return {
      id,
      theme: rotatingTheme(id),
      size: 6,
      nodes: Math.round(lerp(4, 6, t)),
      reach: [3, 5],
      wiggle: lerp(0.45, 0.6, t),
      share: lerp(0.9, 1, t),
      fixed: Math.round(lerp(2, 4, t)),
      unlock: id === 37 ? "Bolted tiles" : undefined,
      blurb: id === 37 ? "Bolted tiles cannot turn. Build the circuit around them." : undefined,
    };
  }
  const t = (id - 47) / 13;
  return {
    id,
    theme: rotatingTheme(id),
    size: 7,
    nodes: Math.round(lerp(5, 7, t)),
    reach: [3, 6],
    wiggle: lerp(0.5, 0.65, t),
    share: 1,
    fixed: Math.round(lerp(3, 6, t)),
    unlock: id === 47 ? "7×7 board" : undefined,
    blurb: id === 47 ? "The biggest board yet, with longer runs and more devices." : undefined,
  };
}

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

function describe(plan: Plan, tees: number): string {
  if (plan.blurb) return plan.blurb;
  const theme = themeById(plan.theme);
  const nodes = `${NUMBER_WORDS[plan.nodes]} ${plan.nodes === 1 ? theme.node : theme.nodePlural}`;
  const board = plan.size > 5 ? ` on a ${plan.size}×${plan.size} board` : "";
  let detail = "Most pipes start turned.";
  if (plan.fixed > 0) {
    const word = NUMBER_WORDS[plan.fixed]!.toLowerCase();
    detail = `${word[0]!.toUpperCase()}${word.slice(1)} bolted ${plan.fixed === 1 ? "tile stays" : "tiles stay"} put.`;
  } else if (tees >= 3) {
    detail = `The circuit splits at ${NUMBER_WORDS[tees]!.toLowerCase()} tees.`;
  }
  return `${nodes}${board}. ${detail}`;
}

/**
 * Grow a wiring tree by seeded random walks. The first walk leaves the
 * source, and each later walk starts from a straight or corner on the tree,
 * which then becomes a tee. Each walk ends at a node.
 */
function growRoutes(plan: Plan, attempt: number): Coord[][] | null {
  const rand = mulberry32(plan.id * 7919 + attempt * 104729);
  const size = plan.size;
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
  const parent = new Map<string, string | null>();
  const degree = new Map<string, number>();
  const nodes: string[] = [];

  const edge: Coord[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (row === 0 || col === 0 || row === size - 1 || col === size - 1) edge.push([row, col]);
    }
  }
  const source = pick(edge);
  const sourceKey = keyOf(source[0], source[1]);
  parent.set(sourceKey, null);
  degree.set(sourceKey, 0);

  const free = (row: number, col: number) =>
    row >= 0 && col >= 0 && row < size && col < size && !parent.has(keyOf(row, col));

  const walk = (from: Coord): boolean => {
    const target = plan.reach[0] + Math.floor(rand() * (plan.reach[1] - plan.reach[0] + 1));
    let at = from;
    let heading: (typeof DIRS)[number] | null = null;
    const steps: Coord[] = [];
    for (let step = 0; step < target; step++) {
      const open = DIRS.filter((dir) => free(at[0] + dir.dr, at[1] + dir.dc));
      if (open.length === 0) break;
      type Dir = (typeof DIRS)[number];
      const straight: Dir | null =
        heading && open.includes(heading) && rand() > plan.wiggle ? heading : null;
      const dir: Dir = straight ?? pick(open);
      const next: Coord = [at[0] + dir.dr, at[1] + dir.dc];
      const nextKey = keyOf(next[0], next[1]);
      parent.set(nextKey, keyOf(at[0], at[1]));
      degree.set(nextKey, 1);
      const atKey = keyOf(at[0], at[1]);
      degree.set(atKey, (degree.get(atKey) ?? 0) + 1);
      steps.push(next);
      heading = dir;
      at = next;
    }
    if (steps.length < plan.reach[0]) return false;
    nodes.push(keyOf(at[0], at[1]));
    return true;
  };

  if (!walk(source)) return null;
  // Any later walk joins the tree past the source's only step.
  for (let count = 1; count < plan.nodes; count++) {
    const branches = [...parent.keys()].filter((cellKey) => {
      if (cellKey === sourceKey || nodes.includes(cellKey) || degree.get(cellKey) !== 2) return false;
      const [row, col] = cellKey.split(",").map(Number) as [number, number];
      return DIRS.some((dir) => free(row + dir.dr, col + dir.dc));
    });
    if (branches.length === 0) return null;
    const [row, col] = pick(branches).split(",").map(Number) as [number, number];
    if (!walk([row, col])) return null;
  }

  return nodes.map((node) => {
    const path: Coord[] = [];
    for (let cursor: string | null = node; cursor; cursor = parent.get(cursor) ?? null) {
      const [row, col] = cursor.split(",").map(Number) as [number, number];
      path.push([row, col]);
    }
    return path.reverse();
  });
}

function generateLevel(id: number, name: string): Level {
  const plan = planFor(id);
  const [low, high] = parBand(id);
  let closest: { level: Level; miss: number } | null = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const routes = growRoutes(plan, attempt);
    if (!routes) continue;
    try {
      const level = buildLevel({
        id,
        name,
        blurb: "",
        theme: plan.theme,
        size: plan.size,
        unlock: plan.unlock,
        seed: id * 13 + attempt,
        routes,
        scramble: { share: plan.share },
        fixed: plan.fixed,
      });
      const tees = level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
      const routeCells = level.tiles.filter((tile) => tile.onRoute).length;
      // Keep boards busy enough to read as a step up, without filling every cell.
      if (routeCells < plan.size * plan.size * 0.45 || routeCells > plan.size * plan.size * 0.8) continue;
      const described = { ...level, blurb: describe(plan, tees) };
      const miss = level.par < low ? low - level.par : level.par > high ? level.par - high : 0;
      if (miss === 0) return described;
      if (!closest || miss < closest.miss) closest = { level: described, miss };
    } catch {
      // This tree could not be filled without a stray link. Try the next seed.
    }
  }
  if (closest) return closest.level;
  throw new Error(`Could not build level ${id}`);
}

/** Fewest taps a generated level should need. The band climbs a little each level. */
function parBand(id: number): readonly [number, number] {
  let low: number;
  if (id <= 22) low = Math.round(lerp(12, 19, (id - 16) / 6));
  else if (id <= 32) low = Math.round(lerp(18, 25, (id - 27) / 5));
  else if (id <= 36) low = Math.round(lerp(23, 26, (id - 33) / 3));
  else if (id <= 46) low = Math.round(lerp(24, 33, (id - 37) / 9));
  else low = Math.round(lerp(32, 46, (id - 47) / 13));
  return [low, low + 4];
}

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

function assertOrthogonal(a: Coord, b: Coord, size: number, label: string) {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  if (dr + dc !== 1)
    throw new Error(`${label} steps from ${keyOf(a[0], a[1])} to ${keyOf(b[0], b[1])}`);
  for (const [row, col] of [a, b]) {
    if (row < 0 || col < 0 || row >= size || col >= size) {
      throw new Error(`${label} leaves the board at ${keyOf(row, col)}`);
    }
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
function extendStubs(
  masks: Map<string, number>,
  route: Set<string>,
  terminals: Set<string>,
  size: number,
) {
  for (const [cellKey, mask] of [...masks]) {
    if (terminals.has(cellKey) || popcount(mask) !== 1) continue;
    const [row, col] = cellKey.split(",").map(Number) as [number, number];
    let best: (typeof DIRS)[number] | null = null;
    let bestScore = 99;
    for (const dir of DIRS) {
      if (mask & dir.bit) continue;
      const nr = row + dir.dr;
      const nc = col + dir.dc;
      const off = nr < 0 || nc < 0 || nr >= size || nc >= size;
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

function forbiddenAt(row: number, col: number, masks: Map<string, number>, size: number): number {
  let forbidden = 0;
  for (const dir of DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
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

/** Turn a seeded share of the route. Bolted tiles are never picked. */
function shareScramble(
  onRoute: Map<string, Kind>,
  bolted: Set<string>,
  share: number,
  seed: number,
): Record<string, number> {
  const rand = mulberry32(seed * 2654435761);
  const keys = [...onRoute.keys()].filter((cellKey) => !bolted.has(cellKey)).sort();
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  const count = Math.max(2, Math.round(keys.length * share));
  const scramble: Record<string, number> = {};
  for (const cellKey of keys.slice(0, count)) {
    scramble[cellKey] = normalizeScramble(onRoute.get(cellKey)!, 1 + Math.floor(rand() * 3));
  }
  return scramble;
}

/** Bolt a seeded set of route pipes. The source and the nodes always turn. */
function pickBolted(
  kinds: Map<string, Kind>,
  terminals: Set<string>,
  count: number,
  seed: number,
): Set<string> {
  if (count <= 0) return new Set();
  const rand = mulberry32(seed * 40503 + 17);
  const keys = [...kinds.keys()].filter((cellKey) => !terminals.has(cellKey)).sort();
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  return new Set(keys.slice(0, count));
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

/** Fewest clockwise taps that bring each route tile back to its solved openings. */
export function tapsToSolve(tiles: readonly TileModel[]): number {
  let taps = 0;
  for (const tile of tiles) {
    if (!tile.onRoute) continue;
    let turns = 0;
    while (!sameOpenings(tile.kind, tile.initial + turns, tile.solution)) turns++;
    taps += turns;
  }
  return taps;
}

function buildLevel(spec: LevelSpec): Level {
  const size = spec.size ?? GRID_SIZE;
  const seed = spec.seed ?? spec.id;
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
      assertOrthogonal(prev, coord, size, `Level ${spec.id} route`);
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
  extendStubs(masks, route, terminals, size);

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

  const bolted = pickBolted(kinds, terminals, spec.fixed ?? 0, seed);
  let scramble: Record<string, number>;
  if (spec.scramble === "all") {
    scramble = autoScramble(kinds, terminals, seed * 3);
  } else if ("share" in spec.scramble) {
    scramble = shareScramble(kinds, bolted, spec.scramble.share as number, seed);
  } else {
    scramble = Object.fromEntries(
      Object.entries(spec.scramble as Record<string, number>).map(([cellKey, amount]) => {
        const kind = kinds.get(cellKey);
        if (!kind) throw new Error(`Level ${spec.id} scrambles empty cell ${cellKey}`);
        return [cellKey, normalizeScramble(kind, amount)];
      }),
    );
  }
  for (const cellKey of bolted) delete scramble[cellKey];

  const tiles: TileModel[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cellKey = keyOf(row, col);
      const onRoute = masks.has(cellKey);
      const shape = onRoute
        ? classify(masks.get(cellKey)!)
        : chooseFiller(forbiddenAt(row, col, masks, size), row * size + col + seed * 17);
      if (!onRoute) masks.set(cellKey, shape.mask);
      const role: Role = cellKey === startKey ? "start" : targetKeys.has(cellKey) ? "end" : "play";
      const solution = shape.rot;
      const initial = (solution + (scramble[cellKey] ?? 0)) % 4;
      tiles.push({ kind: shape.kind, solution, initial, role, onRoute, fixed: bolted.has(cellKey) });
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
    size,
    unlock: spec.unlock,
    tiles,
    solutionPath,
    par: tapsToSolve(tiles),
  };
}

const ALARM_OPENERS: readonly LevelSpec[] = [
  moved(4, 13, { unlock: "Building Alarm" }),
  moved(5, 14),
  moved(6, 15),
];

const FIRE_OPENERS: readonly LevelSpec[] = [
  moved(7, 23, { unlock: "School Fire Alarm" }),
  moved(8, 24),
  moved(9, 25),
  moved(10, 26),
];

export const LEVEL_COUNT = 60;

export const LEVELS: readonly Level[] = (() => {
  const named: Record<ThemeId, number> = { lights: 0, alarm: 0, fire: 0 };
  return Array.from({ length: LEVEL_COUNT }, (_, index) => {
    const id = index + 1;
    const spec =
      HOUSE_SPECS.find((item) => item.id === id) ??
      ALARM_OPENERS.find((item) => item.id === id) ??
      FIRE_OPENERS.find((item) => item.id === id);
    if (spec) return buildLevel(spec);
    const theme = planFor(id).theme;
    const names = NAMES[theme];
    const name = names[named[theme]++ % names.length]!;
    return generateLevel(id, name);
  });
})();

/** The original ten boards. Daily keeps drawing from these. */
export const DAILY_POOL: readonly Level[] = CLASSIC_SPECS.map((spec) => buildLevel(spec));

export const CHAPTERS: readonly Chapter[] = [
  { title: "House Lights", from: 1, to: 12, note: "5×5 · learn the basics" },
  { title: "Building Alarm", from: 13, to: 22, note: "5×5 · longer runs, more sensors" },
  { title: "School Fire Alarm", from: 23, to: 32, note: "5×5 · busier circuits" },
  { title: "Wider boards", from: 33, to: 46, note: "6×6 · bolted tiles from level 37" },
  { title: "Whole building", from: 47, to: LEVEL_COUNT, note: "7×7 · bolted tiles, most devices" },
];

export function chapterOf(levelId: number): Chapter {
  return CHAPTERS.find((chapter) => levelId >= chapter.from && levelId <= chapter.to) ?? CHAPTERS[0]!;
}

export function boardCells(level: Level, spins: readonly number[]): Cell[] {
  return level.tiles.map((tile, index) => ({
    kind: tile.kind,
    rotation: (((spins[index] ?? tile.initial) % 4) + 4) % 4,
    role: tile.role,
  }));
}
