import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAPTERS,
  LEVELS,
  boardCells,
  estimateSeconds,
  tapsToSolve,
  targetSeconds,
  type Level,
} from "./levels.ts";
import {
  E,
  N,
  S,
  W,
  cellMask,
  findMisrotatedIndex,
  findPath,
  reachTargets,
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

  it("follows the same rule on a 6×6 board", () => {
    const cells: Cell[] = Array.from({ length: 36 }, () => ({
      kind: "straight" as const,
      rotation: 0,
      role: "play" as const,
    }));
    cells[6] = { kind: "cap", rotation: 1, role: "start" };
    for (let col = 7; col < 11; col++) cells[col] = { kind: "straight", rotation: 1, role: "play" };
    cells[11] = { kind: "cap", rotation: 3, role: "end" };
    assert.deepEqual(findPath(cells), [6, 7, 8, 9, 10, 11]);
    cells[9] = { ...cells[9]!, rotation: 0 };
    assert.equal(findPath(cells), null);
    assert.throws(() => reachTargets(cells.slice(0, 30)));
  });

  it("powers a node only when every target is reached", () => {
    const cells: Cell[] = Array.from({ length: 25 }, () => ({
      kind: "straight" as const,
      rotation: 0,
      role: "play" as const,
    }));
    cells[10] = { kind: "cap", rotation: 1, role: "start" };
    cells[11] = { kind: "tee", rotation: 3, role: "play" };
    cells[6] = { kind: "cap", rotation: 2, role: "end" };
    cells[12] = { kind: "cap", rotation: 3, role: "end" };
    const open = reachTargets(cells);
    assert.equal(open.complete, true);
    assert.deepEqual(open.reached, [6, 12]);

    const oneDry = cells.map((cell, index) => (index === 11 ? { ...cell, rotation: 0 } : cell));
    assert.equal(reachTargets(oneDry).complete, false);
  });
});

describe("levels", () => {
  it("ships one hundred solvable boards that start unsolved", () => {
    assert.equal(LEVELS.length, 100);
    LEVELS.forEach((level, index) => {
      assert.equal(level.id, index + 1);
      assert.equal(level.tiles.length, level.size * level.size, level.name);
      assert.equal(level.tiles.filter((tile) => tile.role === "start").length, 1);
      const solved = reachTargets(
        boardCells(
          level,
          level.tiles.map((tile) => tile.solution),
        ),
      );
      assert.equal(solved.complete, true, `${level.id} ${level.name} solution`);
      assert.deepEqual(spread(solved.paths), level.solutionPath, `${level.id} ${level.name} path`);
      const initial = reachTargets(
        boardCells(
          level,
          level.tiles.map((tile) => tile.initial),
        ),
      );
      assert.equal(initial.complete, false, `${level.id} ${level.name} should start unsolved`);

      const scrambled = level.tiles.filter(
        (tile) => tile.onRoute && !sameOpenings(tile.kind, tile.initial, tile.solution),
      );
      assert.ok(scrambled.length >= 2, `${level.name} scrambles ${scrambled.length}`);
      assert.equal(level.par, tapsToSolve(level.tiles));

      const hint = findMisrotatedIndex(
        level.tiles.map((tile) => ({ ...tile, rotation: tile.initial })),
      );
      assert.equal(hint, level.tiles.indexOf(scrambled[0]!), `${level.name} hint`);
    });
  });

  it("rotates themes in short blocks while board sizes grow to 7×7", () => {
    let run = 1;
    for (let i = 1; i < LEVELS.length; i++) {
      if (LEVELS[i]!.theme === LEVELS[i - 1]!.theme) run++;
      else {
        assert.ok(run >= 3 && run <= 5, `levels ${LEVELS[i - 1]!.id - run + 1}–${LEVELS[i - 1]!.id} run ${run}`);
        run = 1;
      }
      assert.ok(LEVELS[i]!.size >= LEVELS[i - 1]!.size, `level ${LEVELS[i]!.id} shrinks`);
    }
    assert.ok(run >= 3 && run <= 5, `final run ${run}`);
    for (const level of LEVELS) {
      const size = level.id <= 22 ? 5 : level.id <= 40 ? 6 : 7;
      assert.equal(level.size, size, `level ${level.id} size`);
      assert.ok(level.size <= 7, `level ${level.id} is ${level.size}×${level.size}`);
    }
    assert.deepEqual(
      CHAPTERS.map((chapter) => [chapter.title, chapter.ids.length]),
      [
        ["Lighting", 25],
        ["Plumbing", 25],
        ["Public Announcement", 25],
        ["Fire Safety", 25],
      ],
    );
    for (const chapter of CHAPTERS) {
      assert.ok(chapter.ids.every((id) => LEVELS[id - 1]!.theme === chapter.theme));
    }
    assert.equal(CHAPTERS.flatMap((chapter) => chapter.ids).length, LEVELS.length);
  });

  it("marks each new stretch as an unlock", () => {
    const unlocks = LEVELS.flatMap((level) => (level.unlock ? [[level.id, level.unlock]] : []));
    assert.deepEqual(unlocks, [
      [5, "Plumbing"],
      [9, "Public Announcement"],
      [13, "Fire Safety"],
      [18, "Bolted tiles"],
      [23, "6×6 board"],
      [41, "7×7 board"],
    ]);
  });

  it("bolts tiles from level 18, already facing the solution", () => {
    for (const level of LEVELS) {
      const bolted = level.tiles.filter((tile) => tile.fixed);
      if (level.id < 18) {
        assert.equal(bolted.length, 0, `level ${level.id} has bolted tiles`);
        continue;
      }
      assert.ok(bolted.length >= 2, `level ${level.id} needs bolted tiles`);
      for (const tile of bolted) {
        assert.equal(tile.role, "play");
        assert.equal(tile.onRoute, true);
        assert.equal(tile.initial, tile.solution);
      }
    }
  });

  it("starts easy and gets harder stretch by stretch", () => {
    const nodes = (level: Level) => level.tiles.filter((tile) => tile.role === "end").length;
    for (const level of LEVELS.slice(0, 3)) {
      const scrambled = level.tiles.filter(
        (tile) => tile.role === "play" && !sameOpenings(tile.kind, tile.initial, tile.solution),
      );
      assert.ok(scrambled.length <= 4, `${level.name} has ${scrambled.length} turned tiles`);
    }
    assert.deepEqual(LEVELS.slice(0, 4).map(nodes), [1, 2, 2, 1]);
    for (const level of LEVELS.slice(4, 15)) {
      const count = nodes(level);
      assert.ok(count >= 4 && count <= 5, `level ${level.id} has ${count} nodes`);
    }
    for (const level of LEVELS.slice(85)) {
      const count = nodes(level);
      assert.ok(count >= 6 && count <= 7, `level ${level.id} has ${count} nodes`);
    }
    assert.ok(Math.max(...LEVELS.map(nodes)) <= 7);
    const tees = (level: Level) => level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
    const route = (level: Level) => level.tiles.filter((tile) => tile.onRoute).length;
    const mean = (group: readonly Level[], read: (level: Level) => number) =>
      group.reduce((sum, level) => sum + read(level), 0) / group.length;
    const early = LEVELS.slice(4, 15);
    const late = LEVELS.slice(70);
    assert.ok(mean(late, tees) > mean(early, tees), "late boards need more tees");
    assert.ok(mean(late, route) > mean(early, route), "late boards need longer routes");
    const bolted = (level: Level) => level.tiles.filter((tile) => tile.fixed).length;
    assert.ok(mean(LEVELS.slice(80), bolted) > mean(LEVELS.slice(17, 40), bolted));
    const stretches = [
      [1, 15],
      [16, 22],
      [23, 40],
      [41, 70],
      [71, 100],
    ] as const;
    const average = (from: number, to: number, read: (level: Level) => number) => {
      const group = LEVELS.slice(from - 1, to);
      return group.reduce((sum, level) => sum + read(level), 0) / group.length;
    };
    const pars = stretches.map(([from, to]) => average(from, to, (level) => level.par));
    const counts = stretches.map(([from, to]) => average(from, to, nodes));
    for (let i = 1; i < stretches.length; i++) {
      assert.ok(pars[i]! >= pars[i - 1]! - 0.5, `taps ${pars.join(", ")}`);
      assert.ok(counts[i]! >= counts[i - 1]! - 0.2, `nodes ${counts.join(", ")}`);
    }
    assert.ok(pars[4]! > pars[0]! * 2);
    assert.ok(Math.max(...LEVELS.slice(70).map(nodes)) >= 7);
    assert.ok(Math.max(...LEVELS.slice(70).map(nodes)) <= 7);
  });

  it("follows the retention curve without walls", () => {
    const seconds = LEVELS.map(estimateSeconds);
    const within = (from: number, to: number, low: number, high: number) => {
      for (let id = from; id <= to; id++) {
        const value = seconds[id - 1]!;
        assert.ok(value >= low && value <= high, `level ${id} takes about ${value}s`);
      }
    };
    within(1, 4, 0, 45);
    within(5, 15, 70, 140);
    within(16, 40, 100, 250);
    within(41, 70, 180, 360);
    within(71, 100, 250, 420);

    for (let id = 6; id <= LEVELS.length; id++) {
      const step = Math.round((seconds[id - 1]! / seconds[id - 2]! - 1) * 100);
      assert.ok(step <= 15, `level ${id} jumps ${step}%`);
      const floor = [5, 9, 13, 18, 23, 41].includes(id) ? -10 : -3;
      assert.ok(step >= floor, `level ${id} drops ${step}%`);
    }
    for (const level of LEVELS.slice(4)) {
      const target = targetSeconds(level.id);
      assert.ok(
        Math.abs(estimateSeconds(level) - target) / target <= 0.05,
        `level ${level.id} misses its ${target}s target`,
      );
    }
  });

  it("gives every level its own name", () => {
    const names = LEVELS.map((level) => level.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("drops the circuit when the source or a node is turned", () => {
    const level = LEVELS[0]!;
    const solved = level.tiles.map((tile) => tile.solution);
    assert.equal(reachTargets(boardCells(level, solved)).complete, true);
    const source = level.tiles.findIndex((tile) => tile.role === "start");
    const node = level.tiles.findIndex((tile) => tile.role === "end");
    const turn = (index: number) => solved.map((spin, i) => (i === index ? spin + 1 : spin));
    assert.equal(reachTargets(boardCells(level, turn(source))).complete, false);
    assert.equal(reachTargets(boardCells(level, turn(node))).complete, false);
    assert.equal(reachTargets(boardCells(level, solved)).complete, true);
  });
});

function spread(paths: readonly (readonly number[])[]): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const longest = Math.max(...paths.map((path) => path.length));
  for (let step = 0; step < longest; step++) {
    for (const path of paths) {
      const cell = path[step];
      if (cell === undefined || seen.has(cell)) continue;
      seen.add(cell);
      order.push(cell);
    }
  }
  return order;
}
