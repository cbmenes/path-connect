import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_PAR, DAILY_TARGET_SECONDS, LEVELS, boardCells, estimateSeconds } from "./levels.ts";
import { reachTargets } from "./logic.ts";
import { EMPTY_STATS, dailyLevel, dateKey, parseStats, recordFinish, untilNextDaily } from "./daily.ts";

const YEAR = Array.from({ length: 365 }, (_, day) => dailyLevel(new Date(Date.UTC(2026, 0, 1 + day, 12))));

describe("daily challenge", () => {
  it("uses one UTC date key", () => {
    assert.equal(dateKey(new Date("2026-11-04T23:30:00Z")), "2026-11-04");
    assert.equal(dateKey(new Date("2026-11-05T00:30:00Z")), "2026-11-05");
  });

  it("gives every player the same solvable board that day", () => {
    const morning = dailyLevel(new Date("2026-06-01T01:00:00Z"));
    const evening = dailyLevel(new Date("2026-06-01T22:00:00Z"));
    assert.deepEqual(morning.tiles, evening.tiles);
    const solved = reachTargets(boardCells(morning, morning.tiles.map((tile) => tile.solution)));
    assert.equal(solved.complete, true);
    assert.ok(solved.paths.every((path) => path[0] === morning.solutionPath[0]));
  });

  it("stays unsolved at the start and solvable for a whole year", () => {
    for (const board of YEAR) {
      assert.equal(reachTargets(boardCells(board, board.tiles.map((tile) => tile.initial))).complete, false);
      assert.equal(reachTargets(boardCells(board, board.tiles.map((tile) => tile.solution))).complete, true);
    }
  });

  it("holds every day to the campaign 15–25 difficulty band", () => {
    const band = LEVELS.slice(14, 25);
    const low = Math.min(...band.map(estimateSeconds));
    const high = Math.max(...band.map(estimateSeconds));
    for (const board of YEAR) {
      assert.equal(board.size, 5);
      assert.equal(board.tiles.filter((tile) => tile.role === "end").length, 5);
      assert.ok(board.tiles.every((tile) => !tile.fixed));
      assert.ok(board.par >= DAILY_PAR[0] && board.par <= DAILY_PAR[1], `par ${board.par}`);
      const seconds = estimateSeconds(board);
      assert.ok(seconds >= low && seconds <= high, `${seconds}s outside ${low}–${high}s`);
      assert.ok(Math.abs(seconds - DAILY_TARGET_SECONDS) / DAILY_TARGET_SECONDS <= 0.05, `${seconds}s`);
    }
  });

  it("rotates the theme every day", () => {
    for (let day = 1; day < YEAR.length; day++) {
      assert.notEqual(YEAR[day]!.theme, YEAR[day - 1]!.theme);
    }
    assert.deepEqual(new Set(YEAR.map((board) => board.theme)), new Set(["lights", "alarm", "fire"]));
  });

  it("changes the board on the next UTC day", () => {
    const first = dailyLevel(new Date("2026-06-01T12:00:00Z"));
    const second = dailyLevel(new Date("2026-06-02T12:00:00Z"));
    assert.notDeepEqual(
      first.tiles.map((tile) => [tile.kind, tile.initial, tile.role]),
      second.tiles.map((tile) => [tile.kind, tile.initial, tile.role]),
    );
  });
});

describe("daily personal bests", () => {
  it("sets both bests on the first finish", () => {
    const result = recordFinish(EMPTY_STATS, "2026-11-07", { seconds: 140, turns: 30 });
    assert.equal(result.newBestTime, true);
    assert.equal(result.newBestTurns, true);
    assert.deepEqual(result.stats, {
      bestSeconds: 140,
      bestTurns: 30,
      days: { "2026-11-07": { seconds: 140, turns: 30 } },
    });
  });

  it("improves time and turns separately", () => {
    const start = { bestSeconds: 140, bestTurns: 30, days: {} };
    const faster = recordFinish(start, "2026-11-08", { seconds: 120, turns: 34 });
    assert.equal(faster.newBestTime, true);
    assert.equal(faster.newBestTurns, false);
    assert.equal(faster.stats.bestSeconds, 120);
    assert.equal(faster.stats.bestTurns, 30);

    const fewer = recordFinish(faster.stats, "2026-11-09", { seconds: 150, turns: 26 });
    assert.equal(fewer.newBestTime, false);
    assert.equal(fewer.newBestTurns, true);
    assert.equal(fewer.stats.bestSeconds, 120);
    assert.equal(fewer.stats.bestTurns, 26);
  });

  it("does not count a tie as a new best", () => {
    const start = { bestSeconds: 120, bestTurns: 26, days: {} };
    const tie = recordFinish(start, "2026-11-10", { seconds: 120, turns: 26 });
    assert.equal(tie.newBestTime, false);
    assert.equal(tie.newBestTurns, false);
  });

  it("counts only the first finish of a day", () => {
    const first = recordFinish(EMPTY_STATS, "2026-11-07", { seconds: 100, turns: 30 });
    assert.equal(first.counted, true);
    const replay = recordFinish(first.stats, "2026-11-07", { seconds: 40, turns: 24 });
    assert.equal(replay.counted, false);
    assert.equal(replay.newBestTime, false);
    assert.equal(replay.newBestTurns, false);
    assert.deepEqual(replay.stats, first.stats);
  });

  it("counts down to the next UTC day", () => {
    assert.equal(untilNextDaily(new Date("2026-11-07T20:39:00Z")), "3 h 21 m");
    assert.equal(untilNextDaily(new Date("2026-11-07T23:59:30Z")), "1 m");
  });

  it("reads damaged storage as empty", () => {
    assert.deepEqual(parseStats(null), EMPTY_STATS);
    assert.deepEqual(parseStats("{not json"), EMPTY_STATS);
    assert.deepEqual(parseStats('{"bestSeconds":"fast","bestTurns":-3,"days":{"x":{"seconds":5}}}'), EMPTY_STATS);
    assert.deepEqual(parseStats('{"bestSeconds":91.6,"bestTurns":22,"days":{}}'), {
      bestSeconds: 91,
      bestTurns: 22,
      days: {},
    });
  });
});
