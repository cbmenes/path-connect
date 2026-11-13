import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FIXTURE_COLORS,
  LAMP_COLORS,
  PHONE_COLORS,
  SCONCE_COLORS,
  fixtureColors,
  lampColors,
  phoneColors,
  sconceColors,
} from "./fixture-colors.ts";
import { LEVELS } from "./levels.ts";

describe("plumbing fixture colors", () => {
  test("keeps every board balanced", () => {
    for (let id = 1; id <= 400; id++) {
      for (let count = 1; count <= 12; count++) {
        const colors = fixtureColors(id, count);
        assert.equal(colors.length, count);
        const tally = FIXTURE_COLORS.map((color) => colors.filter((c) => c === color).length);
        assert.ok(Math.max(...tally) - Math.min(...tally) <= 1, `level ${id}, ${count} fixtures: ${colors}`);
        for (let i = 1; i < colors.length; i++) {
          assert.notEqual(colors[i], colors[i - 1], `level ${id} repeats ${colors[i]} back to back`);
        }
      }
    }
  });

  test("gives the same board the same colors every time", () => {
    assert.deepEqual(fixtureColors(42, 9), fixtureColors(42, 9));
  });

  test("varies the mix from board to board", () => {
    const plumbing = LEVELS.filter((level) => level.theme === "plumbing");
    const mixes = new Set(plumbing.map((level) => fixtureColors(level.id, 4).join(",")));
    assert.ok(mixes.size >= 12, `only ${mixes.size} different mixes`);
    const firsts = new Set(plumbing.map((level) => fixtureColors(level.id, 1)[0]));
    assert.equal(firsts.size, FIXTURE_COLORS.length);
  });
});

const NODE_PALETTES = [
  { name: "PA telephone", theme: "alarm", palette: PHONE_COLORS, colors: phoneColors },
  { name: "Lighting sconce", theme: "lights", palette: SCONCE_COLORS, colors: sconceColors },
  { name: "Lighting lamp", theme: "lights", palette: LAMP_COLORS, colors: lampColors },
] as const;

test("Lighting sconces never repeat a lamp color on the same board", () => {
  for (const level of LEVELS.filter((l) => l.theme === "lights")) {
    const nodes = level.tiles.filter((tile) => tile.role === "end").length;
    const lamps = lampColors(level.id, Math.floor((nodes + 3) / 5));
    const sconces = sconceColors(level.id, Math.floor(nodes / 5), lamps);
    assert.ok(!sconces.some((color) => lamps.includes(color)), `level ${level.id}: lamps ${lamps}, sconces ${sconces}`);
  }
});

for (const { name, theme, palette, colors: dealt } of NODE_PALETTES) {
  describe(`${name} colors`, () => {
    test("keeps every board balanced", () => {
      for (let id = 1; id <= 400; id++) {
        for (let count = 1; count <= 6; count++) {
          const colors: readonly string[] = dealt(id, count);
          assert.equal(colors.length, count);
          const tally = palette.map((color) => colors.filter((c) => c === color).length);
          assert.ok(Math.max(...tally) - Math.min(...tally) <= 1, `level ${id}, ${count} nodes: ${colors}`);
          for (let i = 1; i < colors.length; i++) assert.notEqual(colors[i], colors[i - 1]);
        }
      }
    });

    test("spreads colors evenly across the theme's levels", () => {
      const levels = LEVELS.filter((level) => level.theme === theme);
      const firsts: readonly string[] = levels.map((level) => dealt(level.id, 1)[0]!);
      const fair = 1 / palette.length;
      for (const color of palette) {
        const share = firsts.filter((c) => c === color).length / firsts.length;
        assert.ok(share > fair / 2 && share < fair * 1.6, `${color} leads ${Math.round(share * 100)}% of boards`);
      }
    });
  });
}
