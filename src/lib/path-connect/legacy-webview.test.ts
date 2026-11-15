import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMix, parseColor, substituteVars } from "./legacy-webview.ts";
import { PIPE_LAYERS, pipeLayerColor, pipeLayerMix, pipeLayerVar } from "./pipe-layers.ts";

const vars: Record<string, string> = {
  "--color-pc-tile": "#9dbcb6",
  "--color-pc-shade": "var(--color-pc-ink)",
  "--color-pc-ink": "#34504c",
  "--color-pc-pipe-casing": "#a5402f",
  "--color-pc-pipe-light": "#e8a08a",
};
const resolve = (name: string) => vars[name];

test("var() substitution follows nested names and fallbacks", () => {
  assert.equal(substituteVars("var(--missing, var(--color-pc-shade))", resolve), "#34504c");
  assert.equal(substituteVars("var(--missing)", resolve), undefined);
});

test("mixes match what color-mix() computes in oklab", () => {
  assert.equal(evaluateMix("color-mix(in oklab, black 50%, white)", resolve), "rgb(99, 99, 99)");
  assert.equal(
    evaluateMix("color-mix(in oklab, white 30%, transparent)", resolve),
    "rgba(255, 255, 255, 0.3)",
  );
  assert.equal(
    evaluateMix("color-mix(in oklab, var(--color-pc-tile) 100%, black)", resolve),
    "rgb(157, 188, 182)",
  );
  assert.equal(
    evaluateMix("color-mix(in oklab, red 20%, var(--color-pc-tile) 20%)", resolve)?.endsWith(
      ", 0.4)",
    ),
    true,
  );
  assert.equal(
    evaluateMix(
      "color-mix(in oklab, var(--pc-cream, #f4e3c6) 10%, color-mix(in oklab, white 10%, var(--color-pc-tile)))",
      resolve,
    )?.startsWith("rgb("),
    true,
  );
});

test("oklch literals convert to sRGB", () => {
  const red = parseColor("oklch(63.7% .237 25.331)");
  assert.ok(red);
  assert.deepEqual(
    [red.r, red.g, red.b].map((c) => Math.round(c * 255)),
    [251, 44, 54],
  );
});

test("pipe strokes fall back to the original mix wherever the shim is not running", () => {
  for (const layer of PIPE_LAYERS) {
    assert.equal(pipeLayerColor(layer), `var(${pipeLayerVar(layer)}, ${pipeLayerMix(layer)})`);
    assert.ok(evaluateMix(pipeLayerMix(layer), resolve)?.startsWith("rgb("));
  }
});
