/**
 * Electrical systems. The board, the path search, and the level geometry do
 * not change between them. A theme only renames the source and the nodes
 * and swaps the current color.
 */
export type ThemeId = "lights" | "alarm" | "fire";

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
  conduit: "trace";
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
    rule: "Turn a tile a quarter turn. A light comes on only when the wires face each other all the way from the breaker.",
    live: "The circuit is live.",
    complete: "Every light is on.",
    conduit: "trace",
  },
  {
    id: "alarm",
    label: "Alarm",
    title: "Building Alarm",
    kicker: "Building alarm",
    source: "Panel",
    node: "sensor",
    nodePlural: "sensors",
    rule: "Turn a tile a quarter turn. A sensor arms only when the wires face each other all the way from the panel.",
    live: "The loop is live.",
    complete: "Every sensor is armed.",
    conduit: "trace",
  },
  {
    id: "fire",
    label: "Fire",
    title: "School Fire Alarm",
    kicker: "School fire alarm",
    source: "Fire panel",
    node: "detector",
    nodePlural: "detectors",
    rule: "Turn a tile a quarter turn. A detector arms only when the wires face each other all the way from the fire panel.",
    live: "The alarm circuit is live.",
    complete: "Every detector is armed.",
    conduit: "trace",
  },
];

export const DEFAULT_THEME: ThemeId = "lights";

export function themeById(id: ThemeId): CircuitTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}
