/**
 * Conduit styles. The board, the path search, and the levels do not import
 * this file. Swap `DEFAULT_STYLE` or pass another id into the renderer to
 * draw pipes, circuit traces, or beams from the same tile model.
 */
export type StyleId = "pipes" | "wires" | "beams";

export type Conduit = "pipe" | "trace" | "beam";

export interface ConduitStyle {
  id: StyleId;
  label: string;
  conduit: Conduit;
  /** Sentence under the level-complete title. */
  complete: string;
}

export const STYLES: readonly ConduitStyle[] = [
  {
    id: "pipes",
    label: "Pipes",
    conduit: "pipe",
    complete: "Water runs from the source to the outlet.",
  },
  {
    id: "wires",
    label: "Wires",
    conduit: "trace",
    complete: "The circuit is closed.",
  },
  {
    id: "beams",
    label: "Beams",
    conduit: "beam",
    complete: "The beam reaches the outlet.",
  },
];

export const DEFAULT_STYLE: StyleId = "pipes";

export function styleById(id: StyleId): ConduitStyle {
  return STYLES.find((style) => style.id === id) ?? STYLES[0]!;
}
