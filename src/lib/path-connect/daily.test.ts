import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boardCells } from "./levels.ts";
import { reachTargets } from "./logic.ts";
import { dailyLevel, dateKey, isBetterScore } from "./daily.ts";

describe("daily challenge", () => {
  it("uses one UTC date key", () => {
    assert.equal(dateKey(new Date("2026-11-04T23:30:00Z")), "2026-11-04");
    assert.equal(dateKey(new Date("2026-11-05T00:30:00Z")), "2026-11-05");
  });

  it("gives every player the same solvable board that day", () => {
    const morning = dailyLevel(new Date("2026-06-01T01:00:00Z"));
    const evening = dailyLevel(new Date("2026-06-01T22:00:00Z"));
    assert.deepEqual(
      morning.tiles.map((tile) => tile.initial),
      evening.tiles.map((tile) => tile.initial),
    );
    assert.equal(reachTargets(boardCells(morning, morning.tiles.map((tile) => tile.initial))).complete, false);
    const solved = reachTargets(boardCells(morning, morning.tiles.map((tile) => tile.solution)));
    assert.equal(solved.complete, true);
    assert.ok(solved.paths.every((path) => path[0] === morning.solutionPath[0]));
  });

  it("stays unsolved at the start and solvable across a run of days", () => {
    for (let day = 0; day < 90; day += 1) {
      const board = dailyLevel(new Date(Date.UTC(2026, 0, 1 + day, 12)));
      assert.equal(reachTargets(boardCells(board, board.tiles.map((tile) => tile.initial))).complete, false);
      assert.equal(reachTargets(boardCells(board, board.tiles.map((tile) => tile.solution))).complete, true);
    }
  });

  it("changes the board on the next UTC day", () => {
    const first = dailyLevel(new Date("2026-06-01T12:00:00Z"));
    const second = dailyLevel(new Date("2026-06-02T12:00:00Z"));
    assert.notDeepEqual(
      first.tiles.map((tile) => [tile.kind, tile.initial, tile.role]),
      second.tiles.map((tile) => [tile.kind, tile.initial, tile.role]),
    );
  });

  it("ranks more time left ahead of fewer turns", () => {
    assert.equal(isBetterScore({ secondsLeft: 40, turns: 12 }, { secondsLeft: 39, turns: 3 }), true);
    assert.equal(isBetterScore({ secondsLeft: 20, turns: 4 }, { secondsLeft: 20, turns: 5 }), true);
    assert.equal(isBetterScore({ secondsLeft: 20, turns: 6 }, { secondsLeft: 20, turns: 5 }), false);
    assert.equal(isBetterScore({ secondsLeft: 10, turns: 4 }, null), true);
  });
});
