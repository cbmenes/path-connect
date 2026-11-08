/**
 * The systems a level can be wired for. The board, the path search, and the
 * level geometry do not change between them; each level names its own theme.
 */
export type ThemeId = "lights" | "alarm" | "fire" | "plumbing";

export type Conduit = "pipe" | "trace" | "beam";

export interface CircuitTheme {
  id: ThemeId;
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
  {
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
  },
];

export const DEFAULT_THEME: ThemeId = "lights";

export function themeById(id: ThemeId): CircuitTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

