import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyLevel } from "./daily.ts";
import { hintOffer, keepUses, pickHint } from "./hint.ts";
import { LEVELS, boardCells } from "./levels.ts";
import { reachTargets, sameOpenings } from "./logic.ts";
import { placeholderAds } from "./rewarded-ad.ts";

const BOARDS = [...LEVELS, dailyLevel(new Date("2026-11-07T12:00:00Z"))];

describe("hints", () => {
  it("offers one free hint, then one behind an ad, then none", () => {
    assert.deepEqual([0, 1, 2, 3].map(hintOffer), ["free", "ad", "none", "none"]);
  });

  it("points at one wrong, turnable route tile with the right number of taps", () => {
    for (const level of BOARDS) {
      const spins = level.tiles.map((tile) => tile.initial);
      const hint = pickHint(level, spins);
      assert.ok(hint, `level ${level.id} has a hint`);
      const tile = level.tiles[hint.index]!;
      assert.equal(tile.onRoute, true);
      assert.equal(tile.fixed, false);
      assert.ok(hint.turns >= 1 && hint.turns <= 3);
      for (let fewer = 0; fewer < hint.turns; fewer++) {
        assert.equal(sameOpenings(tile.kind, tile.initial + fewer, tile.solution), false);
      }
      assert.equal(sameOpenings(tile.kind, tile.initial + hint.turns, tile.solution), true);
    }
  });

  it("starts from the source side of the circuit", () => {
    for (const level of BOARDS) {
      const spins = level.tiles.map((tile) => tile.initial);
      const hint = pickHint(level, spins)!;
      const position = level.solutionPath.indexOf(hint.index);
      for (const earlier of level.solutionPath.slice(0, Math.max(0, position))) {
        const tile = level.tiles[earlier]!;
        assert.ok(tile.fixed || sameOpenings(tile.kind, spins[earlier]!, tile.solution));
      }
    }
  });

  it("never solves a board on its own", () => {
    for (const level of BOARDS) {
      const spins = level.tiles.map((tile) => tile.initial);
      for (let used = 0; used < 2; used++) {
        const hint = pickHint(level, spins);
        if (!hint) break;
        spins[hint.index] = spins[hint.index]! + hint.turns;
      }
      assert.equal(reachTargets(boardCells(level, spins), level.cols).complete, false, `level ${level.id}`);
    }
  });

  it("stores hints only for the boards still in play", () => {
    const uses = { "level:4": 2, "level:5": 1, "daily:2026-11-06": 1, "daily:2026-11-07": 9, "level:6": 0 };
    assert.deepEqual(keepUses(uses, ["level:5", "daily:2026-11-07", "level:6"]), {
      "level:5": 1,
      "daily:2026-11-07": 2,
    });
  });

  it("has nothing to say about a solved board", () => {
    const level = LEVELS[0]!;
    assert.equal(pickHint(level, level.tiles.map((tile) => tile.solution)), null);
  });

  it("rewards only a placeholder ad that plays to the end", async () => {
    const stopped = new AbortController();
    stopped.abort();
    assert.equal(await placeholderAds.show(stopped.signal), "dismissed");
  });
});
