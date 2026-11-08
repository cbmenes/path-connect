/**
 * Electrical systems. The board, the path search, and the level geometry do
 * not change between them. Levels 1–3 are house lights, 4–6 are a building
 * alarm, and 7–10 are a school fire alarm. The player does not pick a theme.
 */
export type ThemeId = "lights" | "alarm" | "fire";

/**
 * What the board looks like. Each level keeps its own theme; Plumbing is a
 * look the player can switch on, which restyles any board without changing it.
 */
export type LookId = ThemeId | "plumbing";

export type Conduit = "pipe" | "trace" | "beam";

export interface CircuitTheme {
  id: LookId;
  /** Short label on the system switch. */
  label: string;
  /** Full name in the header. */
  title: string;
  kicker: string;
  source: string;
  node: string;
  nodePlural: string;
  rule: string;
  /** Shown while the success current is running. */
  live: string;
  /** Sentence under the level-complete title. */
  complete: string;
  conduit: "pipe";
}

export const THEMES: readonly CircuitTheme[] = [
  {
    id: "lights",
    label: "Lights",
    title: "House Lights",
    kicker: "House lights",
    source: "Breaker",
    node: "light",
    nodePlural: "lights",
    rule: "Turn a tile a quarter turn. A light comes on only when the pipes face each other all the way from the breaker.",
    live: "The lights are coming on.",
    complete: "Every light is on.",
    conduit: "pipe",
  },
  {
    id: "alarm",
    label: "Alarm",
    title: "Building Alarm",
    kicker: "Building alarm",
    source: "Panel",
    node: "sensor",
    nodePlural: "sensors",
    rule: "Turn a tile a quarter turn. A sensor arms only when the pipes face each other all the way from the panel.",
    live: "The sensors are arming.",
    complete: "Every sensor is armed.",
    conduit: "pipe",
  },
  {
    id: "fire",
    label: "Fire",
    title: "School Fire Alarm",
    kicker: "School fire alarm",
    source: "Fire panel",
    node: "detector",
    nodePlural: "detectors",
    rule: "Turn a tile a quarter turn. A detector arms only when the pipes face each other all the way from the fire panel.",
    live: "The detectors are arming.",
    complete: "Every detector is armed.",
    conduit: "pipe",
  },
];

export const PLUMBING: CircuitTheme = {
  id: "plumbing",
  label: "Plumbing",
  title: "Plumbing",
  kicker: "Plumbing",
  source: "Water main",
  node: "fixture",
  nodePlural: "fixtures",
  rule: "Turn a tile a quarter turn. A fixture fills only when the pipes face each other all the way from the water main.",
  live: "The water is running.",
  complete: "Every fixture has water.",
  conduit: "pipe",
};

export const DEFAULT_THEME: ThemeId = "lights";

export function themeById(id: ThemeId): CircuitTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

export function lookById(id: LookId): CircuitTheme {
  return id === "plumbing" ? PLUMBING : themeById(id);
}

/** Room names shown for a level while the Plumbing look is on. The level itself does not change. */
const PLUMBING_ROOMS = [
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
] as const;

export function plumbingRoom(levelId: number): string {
  return PLUMBING_ROOMS[(levelId - 1) % PLUMBING_ROOMS.length]!;
}

export function plumbingBlurb(fixtures: number): string {
  return fixtures === 1 ? "One fixture to fill from the main." : `${fixtures} fixtures to fill from the main.`;
}

const LOOK_KEY = "path-connect-look";

export function readLook(): "plumbing" | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(LOOK_KEY) === "plumbing" ? "plumbing" : null;
  } catch {
    return null;
  }
}

export function writeLook(look: "plumbing" | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (look) localStorage.setItem(LOOK_KEY, look);
    else localStorage.removeItem(LOOK_KEY);
  } catch {
    // Private browsing can refuse storage. The look then lasts for this visit only.
  }
}
