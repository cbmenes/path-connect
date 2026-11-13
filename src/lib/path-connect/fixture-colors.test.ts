import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FIXTURE_COLORS, PHONE_COLORS, fixtureColors, phoneColors } from "./fixture-colors.ts";
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

describe("PA telephone colors", () => {
  test("keeps every board balanced", () => {
    for (let id = 1; id <= 400; id++) {
      for (let count = 1; count <= 6; count++) {
        const colors = phoneColors(id, count);
        assert.equal(colors.length, count);
        const tally = PHONE_COLORS.map((color) => colors.filter((c) => c === color).length);
        assert.ok(Math.max(...tally) - Math.min(...tally) <= 1, `level ${id}, ${count} phones: ${colors}`);
        for (let i = 1; i < colors.length; i++) assert.notEqual(colors[i], colors[i - 1]);
      }
    }
  });

  test("spreads colors evenly across PA levels", () => {
    const pa = LEVELS.filter((level) => level.theme === "alarm");
    const firsts = pa.map((level) => phoneColors(level.id, 1)[0]);
    for (const color of PHONE_COLORS) {
      const share = firsts.filter((c) => c === color).length / firsts.length;
      assert.ok(share > 0.12 && share < 0.38, `${color} leads ${Math.round(share * 100)}% of PA boards`);
    }
  });
});
