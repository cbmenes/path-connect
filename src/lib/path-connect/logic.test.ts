import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEVELS, boardCells } from "./levels.ts";
import {
  E,
  N,
  S,
  W,
  cellMask,
  findMisrotatedIndex,
  findPath,
  rotateMask,
  sameOpenings,
  type Cell,
} from "./logic.ts";

describe("openings", () => {
  it("rotates clockwise", () => {
    assert.equal(rotateMask(N | E, 1), E | S);
    assert.equal(rotateMask(N | S, 1), E | W);
    assert.equal(rotateMask(N | E | S, 1), E | S | W);
    assert.equal(rotateMask(N, 3), W);
  });

  it("treats a half-turned straight as the same pipe", () => {
    assert.equal(sameOpenings("straight", 0, 2), true);
    assert.equal(sameOpenings("straight", 1, 0), false);
    assert.equal(sameOpenings("corner", 0, 2), false);
  });

  it("links only when both tiles face each other", () => {
    const open: Cell[] = Array.from({ length: 25 }, () => ({
      kind: "straight",
      rotation: 0,
      role: "play" as const,
    }));
    open[0] = { kind: "cap", rotation: 1, role: "start" };
    open[1] = { kind: "straight", rotation: 1, role: "play" };
    open[2] = { kind: "cap", rotation: 3, role: "end" };
    assert.deepEqual(findPath(open), [0, 1, 2]);

    const blocked = open.map((cell, index) => (index === 1 ? { ...cell, rotation: 0 } : cell));
    assert.equal(findPath(blocked), null);
    assert.equal(cellMask(blocked[1]!), N | S);
    assert.equal(cellMask(open[1]!), E | W);
  });
});

describe("levels", () => {
  it("ships ten distinct solvable boards", () => {
    assert.equal(LEVELS.length, 10);
    for (const level of LEVELS) {
      assert.equal(level.tiles.length, 25, level.name);
      assert.equal(level.tiles.filter((tile) => tile.role === "start").length, 1);
      assert.equal(level.tiles.filter((tile) => tile.role === "end").length, 1);
      const solved = findPath(
        boardCells(
          level,
          level.tiles.map((tile) => tile.solution),
        ),
      );
      assert.deepEqual(solved, level.solutionPath, `${level.id} ${level.name} solution`);
      const initial = findPath(
        boardCells(
          level,
          level.tiles.map((tile) => tile.initial),
        ),
      );
      assert.equal(initial, null, `${level.id} ${level.name} should start unsolved`);

      const scrambled = level.tiles.filter(
        (tile) =>
          tile.onRoute &&
          tile.role === "play" &&
          !sameOpenings(tile.kind, tile.initial, tile.solution),
      );
      assert.ok(scrambled.length >= 2, `${level.name} scrambles ${scrambled.length}`);

      const hint = findMisrotatedIndex(
        level.tiles.map((tile) => ({ ...tile, rotation: tile.initial })),
      );
      assert.equal(hint, level.tiles.indexOf(scrambled[0]!), `${level.name} hint`);
    }
  });

  it("keeps the first three boards short and lightly scrambled", () => {
    for (const level of LEVELS.slice(0, 3)) {
      assert.ok(level.solutionPath.length <= 7, level.name);
      const scrambled = level.tiles.filter(
        (tile) => tile.role === "play" && !sameOpenings(tile.kind, tile.initial, tile.solution),
      );
      assert.ok(scrambled.length <= 4, `${level.name} has ${scrambled.length} turned tiles`);
    }
    assert.equal(
      LEVELS[4]!.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length >= 1,
      true,
    );
    assert.ok(LEVELS[9]!.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length >= 3);
  });
});
