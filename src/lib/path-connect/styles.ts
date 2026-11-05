/**
 * Conduit styles. The board, the path search, and the levels do not import
 * this file. Swap `DEFAULT_STYLE` or pass another id into the renderer to
 * draw pipes or circuit traces from the same tile model. Beams remains
 * in the type so a later style can turn it back on, but it is not offered.
 */
export type StyleId = "pipes" | "wires" | "beams";

export type Conduit = "pipe" | "trace" | "beam";

export interface ConduitStyle {
  id: StyleId;
  label: string;
  conduit: Conduit;
  /** Sentence under the level-complete title. */
  complete: string;
  /** Shown in the style switch. Beams stays in the model but is not offered. */
  offered: boolean;
}

export const STYLES: readonly ConduitStyle[] = [
  {
    id: "pipes",
    label: "Pipes",
    conduit: "pipe",
    complete: "Every plant has water.",
    offered: true,
  },
  {
    id: "wires",
    label: "Wires",
    conduit: "trace",
    complete: "Every node is powered.",
    offered: true,
  },
  {
    id: "beams",
    label: "Beams",
    conduit: "beam",
    complete: "The beam reaches the outlet.",
    offered: false,
  },
];

export const DEFAULT_STYLE: StyleId = "pipes";

export function styleById(id: StyleId): ConduitStyle {
  return STYLES.find((style) => style.id === id) ?? STYLES[0]!;
}
