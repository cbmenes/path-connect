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
  it("ships three hundred and twenty solvable boards that start unsolved", () => {
    assert.equal(LEVELS.length, 320);
    LEVELS.forEach((level, index) => {
      assert.equal(level.id, index + 1);
      assert.equal(level.tiles.length, level.rows * level.cols, level.name);
      assert.equal(level.tiles.filter((tile) => tile.role === "start").length, 1);
      const solved = reachTargets(
        boardCells(
          level,
          level.tiles.map((tile) => tile.solution),
        ),
        level.cols,
      );
      assert.equal(solved.complete, true, `${level.id} ${level.name} solution`);
      assert.deepEqual(spread(solved.paths), level.solutionPath, `${level.id} ${level.name} path`);
      const initial = reachTargets(
        boardCells(
          level,
          level.tiles.map((tile) => tile.initial),
        ),
        level.cols,
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

  it("rotates themes in blocks of two while boards grow to 7×9", () => {
    let run = 1;
    for (let i = 1; i < LEVELS.length; i++) {
      if (LEVELS[i]!.theme === LEVELS[i - 1]!.theme) run++;
      else {
        const ended = LEVELS[i - 1]!.id;
        assert.equal(run, 2, `levels ${ended - run + 1}–${ended} run ${run}`);
        run = 1;
      }
      assert.ok(LEVELS[i]!.size >= LEVELS[i - 1]!.size, `level ${LEVELS[i]!.id} shrinks`);
    }
    assert.equal(run, 2, `final run ${run}`);
    for (const level of LEVELS) {
      const cols = level.id <= 8 ? 5 : level.id <= 30 ? 6 : 7;
      const rows = level.id <= 8 ? 5 : level.id <= 30 ? 6 : level.id <= 148 ? 7 : level.id <= 236 ? 8 : 9;
      assert.equal(level.size, cols, `level ${level.id} size`);
      assert.equal(level.cols, cols, `level ${level.id} cols`);
      assert.equal(level.rows, rows, `level ${level.id} rows`);
    }
    assert.deepEqual(
      CHAPTERS.map((chapter) => [chapter.title, chapter.ids.length]),
      [
        ["Lighting", 80],
        ["Plumbing", 80],
        ["Public Announcement", 80],
        ["Fire Safety", 80],
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
      [9, "6×6 board"],
      [31, "7×7 board"],
      [149, "7×8 board"],
      [237, "7×9 board"],
    ]);
  });

  it("bolts one solved route tee on the bands that ask for it", () => {
    const boltedBand = (id: number) =>
      (id >= 9 && id <= 16) || (id >= 31 && id <= 38) || (id >= 149 && id <= 156) || (id >= 237 && id <= 244);
    for (const level of LEVELS) {
      const bolted = level.tiles.filter((tile) => tile.fixed);
      assert.equal(bolted.length, boltedBand(level.id) ? 1 : 0, `level ${level.id} bolts`);
      for (const tile of bolted) {
        assert.equal(tile.kind, "tee", `level ${level.id} bolts a ${tile.kind}`);
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
    const shape: readonly (readonly [number, number, number])[] = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
      [5, 6, 5],
      [7, 8, 6],
      [9, 10, 5],
      [11, 13, 6],
      [14, 16, 7],
      [17, 22, 6],
      [23, 30, 7],
      [31, 34, 6],
      [35, 38, 7],
      [39, 60, 6],
      [61, 82, 7],
      [83, 104, 8],
      [105, 126, 9],
      [127, 148, 10],
      [149, 152, 9],
      [153, 156, 10],
      [157, 176, 9],
      [177, 196, 10],
      [197, 216, 11],
      [217, 236, 12],
      [237, 240, 11],
      [241, 244, 12],
      [245, 264, 11],
      [265, 284, 12],
      [285, 320, 13],
    ];
    for (const [from, to, count] of shape) {
      for (const level of LEVELS.slice(from - 1, to)) assert.equal(nodes(level), count, `level ${level.id}`);
    }
    for (const level of LEVELS.slice(3, 30)) {
      const tees = level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
      assert.equal(tees, nodes(level) - 1, `level ${level.id} tees`);
      const turned = level.tiles.filter((tile) => tile.onRoute && !tile.fixed);
      const wrong = turned.filter((tile) =>
        tile.kind === "straight" ? (tile.initial - tile.solution) % 2 !== 0 : tile.initial !== tile.solution,
      );
      assert.equal(wrong.length, turned.length, `level ${level.id} still has solved pipes`);
    }
    assert.equal(Math.max(...LEVELS.map(nodes)), 13);
    const tees = (level: Level) => level.tiles.filter((tile) => tile.onRoute && tile.kind === "tee").length;
    const route = (level: Level) => level.tiles.filter((tile) => tile.onRoute).length;
    const mean = (group: readonly Level[], read: (level: Level) => number) =>
      group.reduce((sum, level) => sum + read(level), 0) / group.length;
    const early = LEVELS.slice(4, 15);
    const late = LEVELS.slice(200);
    assert.ok(mean(late, tees) > mean(early, tees), "late boards need more tees");
    assert.ok(mean(late, route) > mean(early, route), "late boards need longer routes");
    assert.ok(mean(late, (level) => level.par) > mean(early, (level) => level.par) * 1.5);
  });

  it("keeps the house on the edge early and moves it inward later", () => {
    const inset = (level: Level) => {
      const index = level.tiles.findIndex((tile) => tile.role === "start");
      const row = Math.floor(index / level.cols);
      const col = index % level.cols;
      return Math.min(row, col, level.rows - 1 - row, level.cols - 1 - col);
    };
    for (const level of LEVELS) {
      const depth = inset(level);
      const inward = level.id >= 13 && level.id <= 30 && level.id % 3 === 0;
      if (level.id < 13) assert.equal(depth, 0, `level ${level.id} house inset`);
      else if (level.id <= 30) assert.equal(depth, inward ? 2 : 1, `level ${level.id} house inset`);
      else if (level.id < 70) assert.equal(depth, 2, `level ${level.id} house inset`);
      else if (level.id < 151) assert.ok(depth >= 2, `level ${level.id} house inset ${depth}`);
      else assert.ok(depth >= 2 && depth <= 3, `level ${level.id} house inset ${depth}`);
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
    within(1, 3, 0, 70);
    within(4, 8, 50, 160);
    within(9, 12, 100, 180);
    within(13, 30, 130, 280);
    within(31, 44, 180, 320);
    within(45, 80, 220, 520);
    within(81, 148, 350, 700);
    within(149, 236, 520, 900);
    within(237, 320, 680, 980);
    const late = seconds.slice(236);
    assert.ok(late.every((value) => value > seconds[79]!), "the tall boards outlast the mid-game");
    assert.ok(seconds[14]! > seconds[9]!, "level 15 is harder than level 10");
    assert.ok(seconds[19]! > seconds[14]!, "level 20 is harder than level 15");
    assert.ok(seconds[24]! > seconds[19]!, "level 25 is harder than level 20");
    assert.ok(seconds[29]! > seconds[24]!, "level 30 is harder than level 25");
    assert.ok(seconds[319]! > seconds[29]!, "the last level outlasts level 30");

    for (let id = 6; id <= LEVELS.length; id++) {
      const step = Math.round((seconds[id - 1]! / seconds[id - 2]! - 1) * 100);
      assert.ok(step <= 22, `level ${id} jumps ${step}%`);
      assert.ok(step >= -16, `level ${id} drops ${step}%`);
    }
    for (const level of LEVELS.slice(3)) {
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
