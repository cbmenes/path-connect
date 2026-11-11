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

  it("rotates themes in blocks of two while board sizes grow to 7×7", () => {
    let run = 1;
    for (let i = 1; i < LEVELS.length; i++) {
      if (LEVELS[i]!.theme === LEVELS[i - 1]!.theme) run++;
      else {
        const ended = LEVELS[i - 1]!.id;
        assert.equal(run, ended >= 97 ? 1 : 2, `levels ${ended - run + 1}–${ended} run ${run}`);
        run = 1;
      }
      assert.ok(LEVELS[i]!.size >= LEVELS[i - 1]!.size, `level ${LEVELS[i]!.id} shrinks`);
    }
    assert.equal(run, 1, `final run ${run}`);
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
      [3, "Plumbing"],
      [5, "Public Announcement"],
      [7, "Fire Safety"],
      [23, "6×6 board"],
      [41, "7×7 board"],
    ]);
  });

  it("uses bolted tiles as a light anchor that phases out", () => {
    const seen = new Map<Level["theme"], number>();
    for (const level of LEVELS) {
      const bolted = level.tiles.filter((tile) => tile.fixed);
      let expect = 0;
      if (level.size >= 6) {
        const place = (seen.get(level.theme) ?? 0) + 1;
        seen.set(level.theme, place);
        expect = place <= 2 ? 3 : place <= 4 ? 2 : place <= 6 ? 1 : 0;
      }
      assert.equal(bolted.length, expect, `level ${level.id} bolts`);
      assert.ok(bolted.length <= 3);
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
    for (const level of LEVELS.slice(4, 22)) assert.equal(nodes(level), 5, `level ${level.id}`);
    for (const level of LEVELS.slice(22, 35)) assert.equal(nodes(level), 6, `level ${level.id}`);
    for (const level of LEVELS.slice(4, 30)) {
      const tees = level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
      assert.equal(tees, nodes(level) - 1, `level ${level.id} tees`);
      const turned = level.tiles.filter((tile) => tile.onRoute && !tile.fixed);
      const wrong = turned.filter((tile) =>
        tile.kind === "straight" ? (tile.initial - tile.solution) % 2 !== 0 : tile.initial !== tile.solution,
      );
      assert.equal(wrong.length, turned.length, `level ${level.id} still has solved pipes`);
    }
    for (const level of LEVELS.slice(35, 69)) assert.equal(nodes(level), 7, `level ${level.id}`);
    for (const level of LEVELS.slice(69)) assert.equal(nodes(level), 8, `level ${level.id}`);
    assert.equal(Math.max(...LEVELS.map(nodes)), 8);
    const tees = (level: Level) => level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
    const route = (level: Level) => level.tiles.filter((tile) => tile.onRoute).length;
    const mean = (group: readonly Level[], read: (level: Level) => number) =>
      group.reduce((sum, level) => sum + read(level), 0) / group.length;
    const early = LEVELS.slice(4, 15);
    const late = LEVELS.slice(70);
    assert.ok(mean(late, tees) > mean(early, tees), "late boards need more tees");
    assert.ok(mean(late, route) > mean(early, route), "late boards need longer routes");
    const bolted = (level: Level) => level.tiles.filter((tile) => tile.fixed).length;
    assert.ok(mean(LEVELS.slice(80), bolted) < mean(LEVELS.slice(22, 40), bolted));
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
    assert.ok(LEVELS.slice(69).every((level) => nodes(level) === 8));
  });

  it("keeps the house on the edge early and moves it inward later", () => {
    const inset = (level: Level) => {
      const index = level.tiles.findIndex((tile) => tile.role === "start");
      const row = Math.floor(index / level.size);
      const col = index % level.size;
      return Math.min(row, col, level.size - 1 - row, level.size - 1 - col);
    };
    for (const level of LEVELS) {
      const depth = inset(level);
      const inward = level.id >= 15 && level.id <= 30 && level.id % 3 === 0;
      if (level.id < 15) assert.equal(depth, 0, `level ${level.id} house inset`);
      else if (level.id <= 22) assert.equal(depth, inward ? 1 : 0, `level ${level.id} house inset`);
      else if (level.id <= 30) assert.equal(depth, inward ? 2 : 1, `level ${level.id} house inset`);
      else if (level.id < 33) assert.equal(depth, 1, `level ${level.id} house inset`);
      else assert.ok(depth >= 2, `level ${level.id} house inset ${depth}`);
    }
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
    within(5, 15, 45, 92);
    within(16, 25, 90, 180);
    within(26, 30, 120, 240);
    within(31, 40, 100, 260);
    within(41, 70, 220, 420);
    within(71, 100, 350, 480);
    assert.ok(seconds[14]! > seconds[9]!, "level 15 is harder than level 10");
    assert.ok(seconds[19]! > seconds[14]!, "level 20 is harder than level 15");
    assert.ok(seconds[24]! > seconds[19]!, "level 25 is harder than level 20");
    assert.ok(seconds[29]! > seconds[24]!, "level 30 is harder than level 25");

    for (let id = 6; id <= LEVELS.length; id++) {
      const step = Math.round((seconds[id - 1]! / seconds[id - 2]! - 1) * 100);
      assert.ok(step <= 15, `level ${id} jumps ${step}%`);
      const floor = id === 41 ? -10 : -3;
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
