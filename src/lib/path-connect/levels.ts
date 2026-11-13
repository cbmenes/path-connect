/**
 * The campaign. Each level is a wiring tree: every route starts at the
 * source and ends at a node, and routes share a trunk before they split at
 * tees. The builder fills the rest of the board so those fillers do not link
 * to the route, then turns selected tiles clockwise. The source and the nodes
 * can be among them. A level is solvable because the solved board reaches
 * every node, and it starts unsolved.
 *
 * Progression. Difficulty follows the level number, never the theme. Each
 * band below is exact: board size, node count, and bolted tiles.
 * - 1–4 on 5×5 teach the mechanic: one node, then two, three, and four.
 * - 5–6 stay on 5×5 with five nodes. 7–8 stay on 5×5 with six.
 * - 9–16 are 6×6 with one bolted tile: five nodes, then six, then seven.
 *   17–30 stay on 6×6 with no bolts: six nodes, then seven.
 * - 31–38 are 7×7 with one bolted tile: six nodes, then seven.
 *   39–148 stay on 7×7 with no bolts and climb from six nodes to ten.
 * - 149–156 are 7×8 (7 columns by 8 rows) with one bolted tile: nine nodes,
 *   then ten. 157–236 stay on 7×8 with no bolts and climb from nine to twelve.
 * - 237–244 are 7×9 with one bolted tile: eleven nodes, then twelve.
 *   245–320 stay on 7×9 with no bolts and climb from eleven nodes to thirteen.
 * A bolted tile is always a route pipe at its solved facing, preferring a
 * tee, so it locks a split without making the board unsolvable. No board
 * has more than one, and every 5×5 board has none.
 *
 * Themes rotate in blocks of two: Lighting, Plumbing, Public Announcement,
 * then Fire Safety. Forty cycles cover 320 levels, 80 of each theme.
 *
 * Levels 1–3 keep their hand-built routes. Every later level comes from a
 * seeded tree generator, so every player gets the same boards.
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
  /** Column count. Square boards use this for both sides. */
  size: number;
  rows: number;
  cols: number;
  /** What this level opens, such as a new system or board size. Shown as a small "New" label. */
  unlock?: string;
  tiles: TileModel[];
  /** Cells on the solved paths from the source to every node, nearest first. */
  solutionPath: number[];
  /** Fewest taps that solve the board from its starting turns. */
  par: number;
}

/** A level-picker category: every level of one theme, in level order. */
export interface Chapter {
  title: string;
  theme: ThemeId;
  ids: readonly number[];
  /** One line under the chapter title in the level picker. */
  note: string;
}

type Coord = readonly [number, number];

/** Turn every route tile, or a share of them picked from the seed. */
type Scramble = Readonly<Record<string, number>> | "all" | { share: number; minTurn?: number };

interface LevelSpec {
  id: number;
  name: string;
  blurb: string;
  theme: ThemeId;
  size?: number;
  rows?: number;
  cols?: number;
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
/** Level 3 adds a third fixture off the upper branch of the two-room split. */
const THREE_FIXTURES: LevelSpec["routes"] = [
  [[2, 0], [2, 1], [2, 2], [1, 2], [1, 3], [1, 4]],
  [[2, 0], [2, 1], [2, 2], [3, 2], [3, 3], [3, 4]],
  [[2, 0], [2, 1], [2, 2], [1, 2], [1, 3], [0, 3]],
];
/** The first three boards teach one node, then two, then three. */
const OPENING_SPECS: readonly LevelSpec[] = [
  {
    id: 1,
    name: "Porch light",
    blurb: "Power starts at the house. Connect it to the light.",
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
    name: "Three fixtures",
    blurb: "A new system. Trace the fixtures back to the water main.",
    theme: "plumbing",
    unlock: "Plumbing",
    routes: THREE_FIXTURES,
    scramble: { "2,1": 1, "1,2": 1, "3,2": 1, "1,3": 1, "0,3": 1 },
  },
];

/** Levels 1–3 stay hand-built. Every later level is generated. */
const HOUSE_SPECS: readonly LevelSpec[] = [OPENING_SPECS[0]!, OPENING_SPECS[1]!, OPENING_SPECS[2]!];

interface Plan {
  id: number;
  theme: ThemeId;
  size: number;
  rows?: number;
  cols?: number;
  nodes: number;
  /** Cells each new branch walks, inclusive range. */
  reach: readonly [number, number];
  /** Chance a walk turns a corner instead of running straight. */
  wiggle: number;
  share: number;
  /** Smallest quarter-turn used when scrambling. Omitted means one, two, or three. */
  minTurn?: number;
  /** Keep the route on a larger share of a small board. */
  dense?: boolean;
  fixed: number;
  /** How many cells the house sits in from the edge, as a min and max. */
  source: readonly [number, number];
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
    "Pantry",
    "Laundry room",
    "Study",
    "Nursery",
    "Dining room",
    "Front hall",
    "Sleeping porch",
    "Closet hall",
    "East bedroom",
    "Foyer",
    "Landing",
    "Side hall",
    "West bedroom",
    "North bedroom",
    "South bedroom",
    "Reading nook",
    "Morning room",
    "Lamp room",
    "Bay window",
    "Coat room",
    "Upper hall",
    "Sewing room",
    "Billiard room",
    "Music alcove",
    "Map room",
    "Sun porch",
    "Lamp closet",
    "Night nursery",
    "Gallery",
    "Conservatory",
    "Library nook",
    "Dressing room",
    "Guest loft",
    "Sleeping alcove",
    "Front bedroom",
    "Back bedroom",
    "East hall",
    "West hall",
    "South hall",
    "North hall",
    "Lantern room",
    "Candle room",
    "Globe room",
    "Chart room",
    "Studio",
    "Darkroom",
    "Print room",
    "Card room",
    "Tea room",
    "Morning hall",
    "Evening room",
    "Star room",
    "Moon room",
    "Iris room",
    "Fern room",
    "Willow hall",
    "Cedar loft",
    "Birch room",
    "Maple hall",
    "Oak landing",
    "Pine room",
    "Ivy hall",
    "Rose room",
    "Daisy nook",
    "Clover room",
    "Meadow loft",
    "Orchard room",
    "Harvest hall",
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
    "Front lobby",
    "Security desk",
    "Switchboard",
    "Paging booth",
    "Mezzanine",
    "West annex",
    "Call room",
    "Radio bay",
    "Wire room",
    "Speaker loft",
    "Page hall",
    "Bell desk",
    "Night booth",
    "Signal room",
    "Dispatch",
    "Intercom hall",
    "Horn gallery",
    "Mic booth",
    "Relay room",
    "East annex",
    "Tape room",
    "Page booth",
    "Announce hall",
    "Speaker bay",
    "Horn loft",
    "Mic hall",
    "Relay loft",
    "Wire loft",
    "Signal loft",
    "Dispatch loft",
    "Night desk",
    "Call booth",
    "Radio hall",
    "Paging hall",
    "West booth",
    "East booth",
    "South annex",
    "North annex",
    "Bell room",
    "Tone room",
    "Voice room",
    "Cue booth",
    "Stage call",
    "Green room",
    "Sound lock",
    "Air room",
    "Wave booth",
    "Echo hall",
    "Static room",
    "Channel loft",
    "Band booth",
    "Wire booth",
    "Line room",
    "Patch bay",
    "Jack room",
    "Plug hall",
    "Cord loft",
    "Bell loft",
    "Chime room",
    "Tone booth",
    "Cue hall",
    "Call loft",
    "Page loft",
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
    "Chemistry lab",
    "Bus loop",
    "Bell tower",
    "Boiler room",
    "West wing",
    "Drill hall",
    "Annex stairs",
    "Courtyard",
    "South wing",
    "Hose room",
    "Fire stair",
    "Assembly hall",
    "Smoke tower",
    "Exit court",
    "Alarm closet",
    "Pump stair",
    "Red hall",
    "Drill yard",
    "Watch room",
    "Engine bay",
    "Hose loft",
    "Fire hall",
    "Smoke hall",
    "Exit stair",
    "Alarm stair",
    "Pump hall",
    "Red stair",
    "Watch loft",
    "Engine hall",
    "Sprinkler room",
    "Standpipe",
    "Fire escape",
    "Muster court",
    "Hydrant yard",
    "Ladder bay",
    "Rescue bay",
    "First aid",
    "Extinguisher",
    "Heat closet",
    "Flame hall",
    "Ember room",
    "Ash stair",
    "Cinder yard",
    "Siren room",
    "Beacon stair",
    "Ward hall",
    "Hose stair",
    "Bell yard",
    "Red loft",
    "Pump loft",
    "Smoke loft",
    "Exit loft",
    "Alarm loft",
    "Watch stair",
    "Engine loft",
    "Ladder hall",
    "Rescue hall",
    "Hydrant hall",
    "Muster hall",
    "Ember stair",
    "Ash hall",
    "Cinder hall",
    "Siren loft",
    "Beacon hall",
  ],
  plumbing: [
    "Powder room",
    "Guest bath",
    "Kitchen sink",
    "Hall bath",
    "Laundry nook",
    "Primary bath",
    "Butler's pantry",
    "Mudroom",
    "Upstairs bath",
    "Breakfast kitchen",
    "Garden washroom",
    "Pink tile bath",
    "Pool house",
    "Wash house",
    "Scullery",
    "Bath annex",
    "Half bath",
    "Service sink",
    "Clawfoot bath",
    "Tile shower",
    "Basement sink",
    "Garden tap",
    "Utility sink",
    "Corner bath",
    "Soap room",
    "Linen bath",
    "Copper bath",
    "Well room",
    "Pump room",
    "Wash porch",
    "Tub room",
    "Basin nook",
    "Slop sink",
    "Spring house",
    "Rain barrel",
    "Shower stall",
    "Water closet",
    "Boiler bath",
    "Linen closet",
    "Copper sink",
    "Well house",
    "Pump bath",
    "Wash stall",
    "Tub annex",
    "Basin room",
    "Slop room",
    "Spring bath",
    "Rain cistern",
    "Shower annex",
    "Valve room",
    "Pipe chase",
    "Floor drain",
    "Mop sink",
    "Janitor sink",
    "Guest shower",
    "Hall shower",
    "Kitchen bath",
    "Scullery sink",
    "Pantry sink",
    "Mud sink",
    "Pool bath",
    "Garden bath",
    "Service bath",
    "Tap room",
    "Spigot nook",
    "Cistern bath",
    "Well bath",
    "Basin annex",
    "Tub hall",
    "Soap nook",
    "Linen sink",
    "Copper nook",
    "Wash annex",
    "Drain room",
    "Valve bath",
    "Pipe bath",
    "Mop room",
    "Janitor bath",
    "Service nook",
    "Guest tap",
  ],
};

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Campaign themes in the order their blocks come around. */
export const THEME_ORDER: readonly ThemeId[] = ["lights", "plumbing", "alarm", "fire"];
/**
 * Theme runs of 2 levels, cycling Lighting, Plumbing, Public Announcement,
 * and Fire Safety. Forty cycles cover 320 levels, 80 of each theme.
 */
const THEME_BLOCKS: readonly { theme: ThemeId; length: number }[] = Array.from({ length: 40 }, () =>
  THEME_ORDER.map((theme) => ({ theme, length: 2 })),
).flat();

const THEME_OF: readonly ThemeId[] = THEME_BLOCKS.flatMap((block) =>
  Array.from({ length: block.length }, () => block.theme),
);

export function themeOf(id: number): ThemeId {
  const theme = THEME_OF[id - 1];
  if (!theme) throw new Error(`No theme for level ${id}`);
  return theme;
}

/** First campaign level on a 6×6 board. Everything before it is 5×5. */
const SIX_START = 9;
/** First campaign level on a 7×7 board. */
const SEVEN_START = 31;
/** First campaign level on a 7×8 board. */
const RECT_START = 149;
/** First campaign level on a 7×9 board. */
const TALL_START = 237;

/** One exact stretch of the campaign: board, nodes, and whether a tile is bolted. */
interface Band {
  to: number;
  cols: number;
  rows: number;
  nodes: number;
  fixed: number;
  reach: readonly [number, number];
  wiggle: readonly [number, number];
}

/**
 * Levels 4–320. Levels 1–3 stay hand-built and already match the opening of
 * this table: 5×5, one node, then two, then three, and no bolted tiles.
 */
const BANDS: readonly Band[] = [
  { to: 4, cols: 5, rows: 5, nodes: 4, fixed: 0, reach: [2, 4], wiggle: [0.7, 0.7] },
  { to: 6, cols: 5, rows: 5, nodes: 5, fixed: 0, reach: [2, 3], wiggle: [0.74, 0.8] },
  { to: 8, cols: 5, rows: 5, nodes: 6, fixed: 0, reach: [2, 3], wiggle: [0.78, 0.84] },
  { to: 10, cols: 6, rows: 6, nodes: 5, fixed: 1, reach: [3, 5], wiggle: [0.72, 0.78] },
  { to: 13, cols: 6, rows: 6, nodes: 6, fixed: 1, reach: [2, 4], wiggle: [0.74, 0.8] },
  { to: 16, cols: 6, rows: 6, nodes: 7, fixed: 1, reach: [2, 4], wiggle: [0.76, 0.82] },
  { to: 22, cols: 6, rows: 6, nodes: 6, fixed: 0, reach: [2, 5], wiggle: [0.74, 0.82] },
  { to: 30, cols: 6, rows: 6, nodes: 7, fixed: 0, reach: [3, 5], wiggle: [0.76, 0.86] },
  { to: 34, cols: 7, rows: 7, nodes: 6, fixed: 1, reach: [3, 5], wiggle: [0.58, 0.64] },
  { to: 38, cols: 7, rows: 7, nodes: 7, fixed: 1, reach: [3, 5], wiggle: [0.6, 0.68] },
  { to: 60, cols: 7, rows: 7, nodes: 6, fixed: 0, reach: [3, 6], wiggle: [0.6, 0.7] },
  { to: 82, cols: 7, rows: 7, nodes: 7, fixed: 0, reach: [3, 6], wiggle: [0.62, 0.72] },
  { to: 104, cols: 7, rows: 7, nodes: 8, fixed: 0, reach: [3, 6], wiggle: [0.64, 0.74] },
  { to: 126, cols: 7, rows: 7, nodes: 9, fixed: 0, reach: [3, 6], wiggle: [0.66, 0.76] },
  { to: 148, cols: 7, rows: 7, nodes: 10, fixed: 0, reach: [2, 5], wiggle: [0.68, 0.78] },
  { to: 152, cols: 7, rows: 8, nodes: 9, fixed: 1, reach: [3, 6], wiggle: [0.7, 0.74] },
  { to: 156, cols: 7, rows: 8, nodes: 10, fixed: 1, reach: [3, 6], wiggle: [0.72, 0.76] },
  { to: 176, cols: 7, rows: 8, nodes: 9, fixed: 0, reach: [3, 6], wiggle: [0.72, 0.8] },
  { to: 196, cols: 7, rows: 8, nodes: 10, fixed: 0, reach: [3, 6], wiggle: [0.74, 0.82] },
  { to: 216, cols: 7, rows: 8, nodes: 11, fixed: 0, reach: [2, 5], wiggle: [0.76, 0.84] },
  { to: 236, cols: 7, rows: 8, nodes: 12, fixed: 0, reach: [2, 4], wiggle: [0.78, 0.86] },
  { to: 240, cols: 7, rows: 9, nodes: 11, fixed: 1, reach: [3, 6], wiggle: [0.76, 0.8] },
  { to: 244, cols: 7, rows: 9, nodes: 12, fixed: 1, reach: [2, 5], wiggle: [0.78, 0.82] },
  { to: 264, cols: 7, rows: 9, nodes: 11, fixed: 0, reach: [3, 6], wiggle: [0.78, 0.84] },
  { to: 284, cols: 7, rows: 9, nodes: 12, fixed: 0, reach: [2, 5], wiggle: [0.8, 0.86] },
  { to: 320, cols: 7, rows: 9, nodes: 13, fixed: 0, reach: [2, 4], wiggle: [0.8, 0.88] },
];

function bandFor(id: number): { band: Band; from: number } {
  let from = 4;
  for (const band of BANDS) {
    if (id <= band.to) return { band, from };
    from = band.to + 1;
  }
  throw new Error(`No board plan for level ${id}`);
}

/** Early houses stay on the rim. Later houses step inward, then toward the middle. */
function sourceBand(id: number, size: number): readonly [number, number] {
  if (size <= 5) return [0, 0];
  if (size === 6) return [1, 1];
  return id < 70 ? [2, 2] : [2, 3];
}

/**
 * The opening boards, including the first 6×6s, keep the house on the rim.
 * From level 13 some boards pull it inward, and every third one sits near
 * the middle, so the move is occasional rather than a new rule.
 */
function sourceFor(id: number, size: number): readonly [number, number] {
  if (id < 13 || size <= 5) return [0, 0];
  const inward = id % 3 === 0;
  if (id <= 30) return inward ? [2, 2] : [1, 1];
  return sourceBand(id, size);
}

/** Difficulty for a generated level. The band fixes the board, the nodes, and the bolt. */
function planFor(id: number): Plan {
  const theme = themeOf(id);
  const { band, from } = bandFor(id);
  const span = band.to - from;
  const t = span === 0 ? 0 : (id - from) / span;
  const square = band.rows === band.cols;
  return {
    id,
    theme,
    size: band.cols,
    rows: square ? undefined : band.rows,
    cols: square ? undefined : band.cols,
    nodes: band.nodes,
    reach: band.reach,
    wiggle: lerp(band.wiggle[0], band.wiggle[1], t),
    share: 1,
    fixed: band.fixed,
    source: sourceFor(id, band.cols),
    unlock:
      id === 5
        ? "Public Announcement"
        : id === 7
          ? "Fire Safety"
          : id === SIX_START
            ? "6×6 board"
            : id === SEVEN_START
              ? "7×7 board"
              : id === RECT_START
                ? "7×8 board"
                : id === TALL_START
                  ? "7×9 board"
                  : undefined,
    blurb:
      id === 5
        ? "A new system. Trace each speaker back to the house."
        : id === 7
          ? "A new system. Arm every detector from the fire panel."
          : id === SIX_START
            ? "A bigger board, with longer runs between the tees."
            : id === SEVEN_START
              ? "A bigger board, with longer runs and more devices."
              : id === RECT_START || id === TALL_START
                ? "A taller board, with longer runs between the tees."
                : undefined,
  };
}

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
];

function describe(plan: Plan, tees: number): string {
  if (plan.blurb) return plan.blurb;
  const theme = themeById(plan.theme);
  const nodes = `${NUMBER_WORDS[plan.nodes]} ${plan.nodes === 1 ? theme.node : theme.nodePlural}`;
  const cols = plan.cols ?? plan.size;
  const rows = plan.rows ?? plan.size;
  const board =
    plan.size <= 5 ? "" : rows === cols ? ` on a ${plan.size}×${plan.size} board` : ` on a ${cols}×${rows} board`;
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
  const cols = plan.cols ?? plan.size;
  const rows = plan.rows ?? plan.size;
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
  const parent = new Map<string, string | null>();
  const degree = new Map<string, number>();
  const nodes: string[] = [];

  const homes: Coord[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const inset = Math.min(row, col, rows - 1 - row, cols - 1 - col);
      if (inset >= plan.source[0] && inset <= plan.source[1]) homes.push([row, col]);
    }
  }
  const source = pick(homes);
  const sourceKey = keyOf(source[0], source[1]);
  parent.set(sourceKey, null);
  degree.set(sourceKey, 0);

  const free = (row: number, col: number) =>
    row >= 0 && col >= 0 && row < rows && col < cols && !parent.has(keyOf(row, col));

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

interface Goal {
  seconds: number;
  /** Largest miss from `seconds`, as a share, that ends the search early. */
  tolerance: number;
  /** Required taps allowed, inclusive. */
  par?: readonly [number, number];
  attempts: number;
}

/** Share of the route pipes, other than the house and the nodes, that run straight. */
function straightShare(level: Level): number {
  const play = level.tiles.filter((tile) => tile.onRoute && tile.role === "play");
  if (play.length === 0) return 0;
  return play.filter((tile) => tile.kind === "straight").length / play.length;
}

function generateFromPlan(plan: Plan, name: string, goal: Goal): Level {
  let closest: { level: Level; miss: number } | null = null;
  // Levels 4–30 keep the first board that hits the time, then prefer one with fewer straight runs.
  let bend: { level: Level; miss: number; straights: number } | null = null;
  for (let attempt = 0; attempt < goal.attempts; attempt++) {
    const routes = growRoutes(plan, attempt);
    if (!routes) continue;
    try {
      const level = buildLevel({
        id: plan.id,
        name,
        blurb: "",
        theme: plan.theme,
        size: plan.size,
        rows: plan.rows,
        cols: plan.cols,
        unlock: plan.unlock,
        seed: plan.id * 13 + attempt,
        routes,
        scramble: plan.minTurn ? { share: plan.share, minTurn: plan.minTurn } : { share: plan.share },
        fixed: plan.fixed,
      });
      const tees = level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
      const routeCells = level.tiles.filter((tile) => tile.onRoute).length;
      // Keep boards busy enough to read as a step up, without filling every cell.
      // Later boards carry more nodes, so the route may cover a little more of the grid.
      const rows = plan.rows ?? plan.size;
      const cols = plan.cols ?? plan.size;
      const room = plan.nodes >= 11 ? 1 : plan.nodes >= 9 ? 0.96 : plan.nodes >= 6 ? 0.92 : 0.8;
      const area = rows * cols;
      const minShare = plan.nodes >= 12 ? 0.4 : rows !== cols ? 0.48 : plan.dense ? 0.64 : 0.45;
      if (routeCells < area * minShare || routeCells > area * room) continue;
      if (goal.par && (level.par < goal.par[0] || level.par > goal.par[1])) continue;
      const described = { ...level, blurb: describe(plan, tees) };
      const miss = Math.abs(estimateSeconds(level) - goal.seconds) / goal.seconds;
      if (miss <= goal.tolerance) {
        // Daily and every board after the opening take the first tree on target.
        if (plan.id > 30) return described;
        const straights = straightShare(described);
        if (!bend || straights < bend.straights - 0.02 || (straights <= bend.straights && miss < bend.miss)) {
          bend = { level: described, miss, straights };
        }
        continue;
      }
      if (!closest || miss < closest.miss) closest = { level: described, miss };
    } catch {
      // This tree could not be filled without a stray link. Try the next seed.
    }
  }
  if (bend) return bend.level;
  if (closest) return closest.level;
  throw new Error(`Could not build level ${plan.id}`);
}

function generateLevel(id: number, name: string): Level {
  return generateFromPlan(planFor(id), name, {
    seconds: targetSeconds(id),
    tolerance: id >= 127 ? 0.04 : 0.012,
    attempts: id <= 30 ? 1600 : id >= 127 ? 1600 : 1000,
  });
}

/**
 * Daily rotates a hard 5×5, a standard 6×6, and an occasional 7×7. The time
 * target stays inside two to four minutes, with a floor high enough that a
 * practiced player is unlikely to finish in under a minute. It does not use
 * the 7×8 campaign boards, and it does not climb with the campaign.
 */
export const DAILY_FLOOR_SECONDS = 120;
export const DAILY_CEILING_SECONDS = 240;
const DAILY_THEMES: readonly ThemeId[] = ["lights", "alarm", "fire", "plumbing"];
/** Two hard 5×5s and three 6×6s for every 7×7, so the big board stays occasional. */
const DAILY_SHAPES = ["hard5", "six", "hard5", "six", "seven", "six"] as const;

function dailyShape(day: number): (typeof DAILY_SHAPES)[number] {
  const index = ((day % DAILY_SHAPES.length) + DAILY_SHAPES.length) % DAILY_SHAPES.length;
  return DAILY_SHAPES[index]!;
}

function dailyPlan(day: number, theme: ThemeId): Plan {
  const shape = dailyShape(day);
  const id = 100_000 + day;
  if (shape === "hard5") {
    return {
      id,
      theme,
      size: 5,
      nodes: 5,
      reach: [3, 4],
      wiggle: 0.86,
      share: 1,
      minTurn: 2,
      dense: true,
      fixed: 0,
      source: [0, 0],
    };
  }
  if (shape === "six") {
    return {
      id,
      theme,
      size: 6,
      nodes: 6,
      reach: [3, 6],
      wiggle: 0.74,
      share: 1,
      fixed: 0,
      source: [1, 1],
    };
  }
  return {
    id,
    theme,
    size: 7,
    nodes: 6,
    reach: [3, 6],
    wiggle: 0.68,
    share: 1,
    fixed: 0,
    source: [2, 2],
  };
}

function dailyGoal(day: number, shape: (typeof DAILY_SHAPES)[number]): Goal {
  const wobble = (Math.abs(day) % 4) * 6;
  if (shape === "hard5") return { seconds: 150 + wobble, tolerance: 0.08, par: [30, 48], attempts: 900 };
  if (shape === "six") return { seconds: 180 + wobble, tolerance: 0.08, par: [28, 48], attempts: 900 };
  return { seconds: 200 + wobble, tolerance: 0.08, par: [28, 46], attempts: 900 };
}

/** `day` counts UTC days since 1970, so every player gets the same board. */
export function generateDaily(day: number): Level {
  const theme = DAILY_THEMES[((day % DAILY_THEMES.length) + DAILY_THEMES.length) % DAILY_THEMES.length]!;
  const shape = dailyShape(day);
  return generateFromPlan(dailyPlan(day, theme), "Daily challenge", dailyGoal(day, shape));
}

/**
 * Rough solve time for a typical casual player. A board takes a few seconds
 * to read, plus a moment per device. Each required tap then costs more time
 * as devices, board size, and bolted tiles add decisions. This is a planning
 * model, not measured play data.
 */
export function estimateSeconds(level: Level): number {
  const nodes = level.tiles.filter((tile) => tile.role === "end").length;
  const bolted = level.tiles.some((tile) => tile.fixed);
  const perTap = 2.2 + 0.35 * nodes + 0.6 * (level.size - 5) + (bolted ? 0.3 : 0);
  return Math.round(8 + 1.5 * nodes + level.par * perTap);
}

/**
 * End-of-band solve times. The opening lessons stay short, then each band
 * climbs. A band that drops a node, or drops its bolt along with a node,
 * starts easier than the band before it.
 */
const TIME_MARKS: readonly { to: number; at?: number; seconds: number }[] = [
  { to: 4, seconds: 64 },
  { to: 6, seconds: 96 },
  { to: 8, seconds: 128 },
  { to: 10, seconds: 150 },
  { to: 13, seconds: 178 },
  { to: 16, seconds: 210 },
  { to: 22, seconds: 200 },
  { to: 30, seconds: 240 },
  { to: 34, seconds: 270 },
  { to: 38, seconds: 310 },
  { to: 60, seconds: 300 },
  { to: 82, seconds: 380 },
  { to: 104, seconds: 470 },
  { to: 126, seconds: 560 },
  { to: 148, at: 555, seconds: 600 },
  { to: 152, at: 600, seconds: 630 },
  { to: 156, at: 680, seconds: 710 },
  { to: 176, at: 615, seconds: 620 },
  { to: 196, at: 670, seconds: 700 },
  { to: 216, at: 685, seconds: 700 },
  { to: 236, at: 680, seconds: 700 },
  { to: 240, at: 800, seconds: 850 },
  { to: 244, at: 770, seconds: 790 },
  { to: 264, at: 775, seconds: 790 },
  { to: 284, at: 755, seconds: 770 },
  { to: 320, at: 765, seconds: 755 },
];

export function targetSeconds(id: number): number {
  if (id <= 3) return [17, 28, 55][id - 1]!;
  let prevId = 3;
  let prev = 55;
  for (const mark of TIME_MARKS) {
    if (id <= mark.to) {
      if (mark.at === undefined) {
        const t = (id - prevId) / (mark.to - prevId);
        return Math.round(lerp(prev, mark.seconds, t));
      }
      const from = prevId + 1;
      const t = from === mark.to ? 1 : (id - from) / (mark.to - from);
      return Math.round(lerp(mark.at, mark.seconds, t));
    }
    prevId = mark.to;
    prev = mark.seconds;
  }
  return prev;
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

function assertOrthogonal(a: Coord, b: Coord, rows: number, cols: number, label: string) {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  if (dr + dc !== 1)
    throw new Error(`${label} steps from ${keyOf(a[0], a[1])} to ${keyOf(b[0], b[1])}`);
  for (const [row, col] of [a, b]) {
    if (row < 0 || col < 0 || row >= rows || col >= cols) {
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
  rows: number,
  cols: number,
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
      const off = nr < 0 || nc < 0 || nr >= rows || nc >= cols;
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

function forbiddenAt(
  row: number,
  col: number,
  masks: Map<string, number>,
  rows: number,
  cols: number,
): number {
  let forbidden = 0;
  for (const dir of DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
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
  minTurn = 1,
): Record<string, number> {
  const rand = mulberry32(seed * 2654435761);
  const keys = [...onRoute.keys()].filter((cellKey) => !bolted.has(cellKey)).sort();
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  const count = Math.max(2, Math.round(keys.length * share));
  const scramble: Record<string, number> = {};
  const span = Math.max(1, 4 - minTurn);
  for (const cellKey of keys.slice(0, count)) {
    scramble[cellKey] = normalizeScramble(onRoute.get(cellKey)!, minTurn + Math.floor(rand() * span));
  }
  return scramble;
}

/**
 * Bolt a seeded route pipe at its solved facing. A tee comes first, so the
 * bolt locks a split; a corner is the next choice. The source and the nodes
 * always stay free to turn, and the bolt itself is already correct, so the
 * board stays solvable.
 */
function pickBolted(
  kinds: Map<string, Kind>,
  terminals: Set<string>,
  count: number,
  seed: number,
): Set<string> {
  if (count <= 0) return new Set();
  const rand = mulberry32(seed * 40503 + 17);
  const rank = (cellKey: string) => (kinds.get(cellKey) === "tee" ? 0 : kinds.get(cellKey) === "corner" ? 1 : 2);
  const keys = [...kinds.keys()].filter((cellKey) => !terminals.has(cellKey)).sort();
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  keys.sort((a, b) => rank(a) - rank(b));
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
  const cols = spec.cols ?? spec.size ?? GRID_SIZE;
  const rows = spec.rows ?? spec.size ?? GRID_SIZE;
  const size = spec.size ?? cols;
  const span = rows === cols ? undefined : cols;
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
      assertOrthogonal(prev, coord, rows, cols, `Level ${spec.id} route`);
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
  extendStubs(masks, route, terminals, rows, cols);

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
    scramble = shareScramble(
      kinds,
      bolted,
      spec.scramble.share as number,
      seed,
      "minTurn" in spec.scramble ? spec.scramble.minTurn : 1,
    );
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
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellKey = keyOf(row, col);
      const onRoute = masks.has(cellKey);
      const shape = onRoute
        ? classify(masks.get(cellKey)!)
        : chooseFiller(forbiddenAt(row, col, masks, rows, cols), row * cols + col + seed * 17);
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
  while (reachTargets(cellsOf(tiles, "initial"), span).complete && guard < 80) {
    const filler = tiles.filter((tile) => !tile.onRoute);
    const tile = filler[guard % filler.length];
    if (!tile) throw new Error(`Level ${spec.id} has no filler to break a shortcut`);
    tile.initial = (tile.initial + 1) % 4;
    guard++;
  }
  if (reachTargets(cellsOf(tiles, "initial"), span).complete) {
    throw new Error(`Level ${spec.id} is already solved`);
  }

  const solved = reachTargets(cellsOf(tiles, "solution"), span);
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
    rows,
    cols,
    unlock: spec.unlock,
    tiles,
    solutionPath,
    par: tapsToSolve(tiles),
  };
}

export const LEVEL_COUNT = THEME_OF.length;

/** Hand-built levels keep their own names when they open on Lighting; every other level takes its theme's next name. */
export const LEVELS: readonly Level[] = (() => {
  const used: Record<ThemeId, number> = { lights: 0, alarm: 0, fire: 0, plumbing: 0 };
  return Array.from({ length: LEVEL_COUNT }, (_, index) => {
    const id = index + 1;
    const theme = themeOf(id);
    const spec = HOUSE_SPECS.find((item) => item.id === id);
    if (spec && spec.theme !== theme) throw new Error(`Level ${id} is set to ${spec.theme}, but its block is ${theme}`);
    if (spec && theme === "lights") return buildLevel(spec);
    const name = NAMES[theme][used[theme]++];
    if (!name) throw new Error(`No name left for level ${id}`);
    return spec ? buildLevel({ ...spec, name }) : generateLevel(id, name);
  });
})();

const CHAPTER_NOTES: Record<ThemeId, string> = {
  lights: "Bulbs, sage lamps, caged lights, and sconces",
  plumbing: "Tubs, toilets, and sinks",
  alarm: "Horns, microphones, radios, and phones",
  fire: "Bull horns, bells, pull stations, and heat detectors",
};

export const CHAPTERS: readonly Chapter[] = THEME_ORDER.map((theme) => ({
  title: themeById(theme).title,
  theme,
  ids: LEVELS.filter((level) => level.theme === theme).map((level) => level.id),
  note: CHAPTER_NOTES[theme],
}));

export function boardCells(level: Level, spins: readonly number[]): Cell[] {
  return level.tiles.map((tile, index) => ({
    kind: tile.kind,
    rotation: (((spins[index] ?? tile.initial) % 4) + 4) % 4,
    role: tile.role,
  }));
}
