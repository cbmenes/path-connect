/**
 * Layers of the cozy tube, darkest first. `shift` moves a layer toward the
 * light, as a fraction of the pipe width; every layer stays inside the outer rim.
 */
export interface PipeLayer {
  width: number;
  shift: number;
  ink: "shade" | "light";
  mix: number;
  opacity?: number;
}

export const PIPE_LAYERS: PipeLayer[] = [
  { width: 1, shift: 0, ink: "shade", mix: 66 },
  { width: 0.8, shift: 0.07, ink: "shade", mix: 26 },
  { width: 0.44, shift: 0.15, ink: "light", mix: 26, opacity: 0.9 },
  { width: 0.14, shift: 0.24, ink: "light", mix: 92, opacity: 0.95 },
];

export function pipeLayerMix(layer: PipeLayer): string {
  const ink =
    layer.ink === "shade"
      ? "var(--color-pc-pipe-shade, var(--color-pc-shade))"
      : "var(--color-pc-pipe-light)";
  return `color-mix(in oklab, ${ink} ${layer.mix}%, var(--color-pc-pipe-casing, var(--color-pc-casing)))`;
}

export function pipeLayerVar(layer: PipeLayer): string {
  return `--pc-pipe-${layer.ink}-${layer.mix}`;
}

/**
 * The stroke color. The variable is only ever set by the legacy WebView shim,
 * so everywhere else the stroke is the `color-mix()` itself.
 */
export function pipeLayerColor(layer: PipeLayer): string {
  return `var(${pipeLayerVar(layer)}, ${pipeLayerMix(layer)})`;
}
