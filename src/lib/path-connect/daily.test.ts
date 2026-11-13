import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_CEILING_SECONDS, DAILY_FLOOR_SECONDS, boardCells, estimateSeconds } from "./levels.ts";
import { reachTargets } from "./logic.ts";
import {
  EMPTY_STATS,
  dailyLevel,
  dateKey,
  parseStats,
  recordFinish,
  settleStreak,
  untilNextDaily,
} from "./daily.ts";

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

  it("rotates hard 5×5, standard 6×6, and occasional 7×7 boards inside two to four minutes", () => {
    const sizes = YEAR.map((board) => board.size);
    const count = (size: number) => sizes.filter((item) => item === size).length;
    assert.ok(count(7) < count(5) && count(5) < count(6), `mix ${count(5)}/${count(6)}/${count(7)}`);
    assert.ok(count(7) >= 55 && count(7) <= 70, `7×7 days ${count(7)}`);
    for (let day = 1; day < YEAR.length; day++) {
      assert.notEqual(sizes[day], sizes[day - 1], `day ${day} repeats a board size`);
    }
    for (const board of YEAR) {
      assert.equal(board.rows, board.cols);
      assert.equal(board.rows, board.size);
      assert.ok(board.tiles.every((tile) => !tile.fixed));
      const nodes = board.tiles.filter((tile) => tile.role === "end").length;
      const tees = board.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
      assert.equal(tees, nodes - 1);
      assert.equal(nodes, board.size === 5 ? 5 : 6);
      const route = board.tiles.filter((tile) => tile.onRoute).length;
      if (board.size === 5) assert.ok(route >= 16, `hard 5×5 route ${route}`);
      const seconds = estimateSeconds(board);
      assert.ok(seconds >= DAILY_FLOOR_SECONDS && seconds <= DAILY_CEILING_SECONDS, `${board.size}×${board.size} ${seconds}s`);
      const [low, high] = board.size === 5 ? [130, 180] : board.size === 6 ? [160, 230] : [180, 240];
      assert.ok(seconds >= low && seconds <= high, `${board.size}×${board.size} ${seconds}s`);
    }
  });

  it("rotates the theme every day", () => {
    for (let day = 1; day < YEAR.length; day++) {
      assert.notEqual(YEAR[day]!.theme, YEAR[day - 1]!.theme);
    }
    assert.deepEqual(new Set(YEAR.map((board) => board.theme)), new Set(["lights", "alarm", "fire", "plumbing"]));
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
      streak: 1,
      longest: 1,
    });
    assert.equal(result.streak, 1);
    assert.equal(result.milestone, null);
  });

  it("improves time and turns separately", () => {
    const start = { bestSeconds: 140, bestTurns: 30, days: {}, streak: 0, longest: 0 };
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
    const start = { bestSeconds: 120, bestTurns: 26, days: {}, streak: 0, longest: 0 };
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
      streak: 0,
      longest: 0,
    });
  });
});

describe("daily streak", () => {
  const finish = (stats: typeof EMPTY_STATS, key: string) => recordFinish(stats, key, { seconds: 100, turns: 20 });

  it("grows by one for each consecutive day", () => {
    let stats = EMPTY_STATS;
    for (let day = 1; day <= 3; day++) {
      const done = finish(stats, `2026-11-0${day}`);
      assert.equal(done.counted, true);
      assert.equal(done.streak, day);
      assert.equal(done.longest, day);
      assert.equal(done.milestone, day === 3 ? 3 : null);
      stats = done.stats;
    }
    const replay = finish(stats, "2026-11-03");
    assert.equal(replay.counted, false);
    assert.equal(replay.milestone, null);
    assert.equal(replay.streak, 3);
  });

  it("stays alive the morning after a finish and resets once a day is missed", () => {
    let stats = EMPTY_STATS;
    let seventh = finish(EMPTY_STATS, "2026-11-01");
    for (let day = 1; day <= 7; day++) {
      seventh = finish(stats, `2026-11-${String(day).padStart(2, "0")}`);
      stats = seventh.stats;
    }
    assert.equal(stats.streak, 7);
    assert.equal(stats.longest, 7);
    assert.equal(seventh.milestone, 7);
    assert.equal(finish(stats, "2026-11-07").milestone, null);

    assert.equal(settleStreak(stats, "2026-11-08").streak, 7);
    const missed = settleStreak(stats, "2026-11-09");
    assert.equal(missed.streak, 0);
    assert.equal(missed.longest, 7);

    const again = finish(missed, "2026-11-09");
    assert.equal(again.counted, true);
    assert.equal(again.streak, 1);
    assert.equal(again.longest, 7);
    assert.equal(again.milestone, null);
    assert.equal(again.stats.bestSeconds, 100);
  });

  it("crosses a month and only marks the listed milestones", () => {
    let stats = finish(EMPTY_STATS, "2026-01-31").stats;
    const next = finish(stats, "2026-02-01");
    assert.equal(next.streak, 2);
    assert.equal(next.milestone, null);

    stats = EMPTY_STATS;
    const marked: number[] = [];
    for (let day = 0; day < 100; day++) {
      const done = finish(stats, shift(day));
      if (done.milestone) marked.push(done.milestone);
      stats = done.stats;
    }
    assert.deepEqual(marked, [3, 7, 14, 30, 100]);
    assert.equal(stats.longest, 100);
    assert.equal(finish(stats, shift(99)).milestone, null);
  });

  it("rebuilds a streak saved before streaks existed", () => {
    const parsed = parseStats(
      '{"bestSeconds":80,"bestTurns":20,"days":{"2026-11-01":{"seconds":80,"turns":20},"2026-11-02":{"seconds":90,"turns":21}}}',
    );
    const live = settleStreak(parsed, "2026-11-03");
    assert.equal(live.streak, 2);
    assert.equal(live.longest, 2);
    assert.equal(settleStreak(parsed, "2026-11-04").streak, 0);
    assert.equal(settleStreak(parsed, "2026-11-04").longest, 2);
  });
});

function shift(day: number): string {
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
}
