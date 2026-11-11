/**
 * Path Connect rules.
 *
 * Tiles store openings as a 4-bit mask (N=1, E=2, S=4, W=8). Rotation is
 * clockwise quarter-turns of that mask. A link exists only when two
 * orthogonal neighbors both open toward each other. Search walks those
 * links from the source. A board is complete only when every target is
 * reached.
 *
 * Boards are square. The side length comes from the number of cells, so a
 * 5×5, 6×6, or 7×7 board follows the same rules.
 *
 * Visual styles never belong in here. Renderers read `kind` + `rotation`
 * and draw whatever conduit they want.
 */

/** Side length of the classic boards. Larger boards pass their own size. */
export const GRID_SIZE = 5;

export function boardSize(cellCount: number): number {
  const size = Math.round(Math.sqrt(cellCount));
  if (size < 2 || size * size !== cellCount) {
    throw new Error(`Expected a square board, got ${cellCount} cells`);
  }
  return size;
}

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export const DIRS = [
  { id: "N", bit: N, dr: -1, dc: 0, opposite: S },
  { id: "E", bit: E, dr: 0, dc: 1, opposite: W },
  { id: "S", bit: S, dr: 1, dc: 0, opposite: N },
  { id: "W", bit: W, dr: 0, dc: -1, opposite: E },
] as const;

export type DirId = (typeof DIRS)[number]["id"];
export type Kind = "straight" | "corner" | "tee" | "cap";
export type Role = "start" | "end" | "play";

export interface Cell {
  kind: Kind;
  /** Clockwise quarter-turns from the kind's base openings. */
  rotation: number;
  role: Role;
}

/** Openings before any rotation. Straight is vertical, corner is NE, tee is NES, cap points north. */
export function baseMask(kind: Kind): number {
  switch (kind) {
    case "straight":
      return N | S;
    case "corner":
      return N | E;
    case "tee":
      return N | E | S;
    case "cap":
      return N;
  }
}

/** Clockwise quarter-turns. N becomes E, E becomes S, S becomes W, W becomes N. */
export function rotateMask(mask: number, turns: number): number {
  let m = mask & 15;
  const steps = ((turns % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) {
    const north = m & N;
    const east = m & E;
    const south = m & S;
    const west = m & W;
    m = (north ? E : 0) | (east ? S : 0) | (south ? W : 0) | (west ? N : 0);
  }
  return m;
}

export function cellMask(cell: Cell): number {
  return rotateMask(baseMask(cell.kind), cell.rotation);
}

export function sameOpenings(kind: Kind, rotA: number, rotB: number): boolean {
  return rotateMask(baseMask(kind), rotA) === rotateMask(baseMask(kind), rotB);
}

export function openingIds(mask: number): DirId[] {
  return DIRS.filter((dir) => mask & dir.bit).map((dir) => dir.id);
}

export function indexOf(row: number, col: number, size = GRID_SIZE): number {
  return row * size + col;
}

export function rowCol(index: number, size = GRID_SIZE): { row: number; col: number } {
  return { row: Math.floor(index / size), col: index % size };
}

export interface Reach {
  /** Target indexes the source can currently power, in board order. */
  reached: number[];
  complete: boolean;
  /** Shortest mutual-opening path to each reached target, source first. */
  paths: number[][];
}

/**
 * Shortest mutual-opening path from the source to the first target.
 * Returns cell indexes, source first, or null when that target is sealed off.
 */
export function findPath(cells: readonly Cell[]): number[] | null {
  const start = sourceIndex(cells);
  const end = cells.findIndex((cell) => cell.role === "end");
  if (start < 0 || end < 0) return null;
  const previous = walkLinks(cells, start, end);
  return previous.has(end) ? trace(previous, end) : null;
}

/** Every target is connected only when the source can reach all of them. */
export function reachTargets(cells: readonly Cell[]): Reach {
  const start = sourceIndex(cells);
  const ends = cells.flatMap((cell, index) => (cell.role === "end" ? [index] : []));
  if (start < 0 || ends.length === 0) return { reached: [], complete: false, paths: [] };
  const previous = walkLinks(cells, start, null);
  const reached = ends.filter((end) => previous.has(end));
  return {
    reached,
    complete: reached.length === ends.length,
    paths: reached.map((end) => trace(previous, end)),
  };
}

function sourceIndex(cells: readonly Cell[]): number {
  boardSize(cells.length);
  return cells.findIndex((cell) => cell.role === "start");
}

/** Breadth-first walk across mutual openings. Stops early only when `stopAt` is set. */
function walkLinks(cells: readonly Cell[], start: number, stopAt: number | null): Map<number, number> {
  const size = boardSize(cells.length);
  const previous = new Map<number, number>();
  previous.set(start, -1);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (stopAt !== null && current === stopAt) break;
    const { row, col } = rowCol(current, size);
    const mask = cellMask(cells[current]!);
    for (const dir of DIRS) {
      if ((mask & dir.bit) === 0) continue;
      const nr = row + dir.dr;
      const nc = col + dir.dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const next = indexOf(nr, nc, size);
      if (previous.has(next)) continue;
      const neighbor = cellMask(cells[next]!);
      if ((neighbor & dir.opposite) === 0) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }

  return previous;
}

function trace(previous: Map<number, number>, end: number): number[] {
  const path: number[] = [];
  for (let cursor = end; cursor !== -1; cursor = previous.get(cursor)!) {
    path.push(cursor);
  }
  path.reverse();
  return path;
}

/**
 * One tile on the authored route whose openings are not the solution yet.
 * The source and the nodes count: they rotate, and a wrong facing breaks the circuit.
 */
export function findMisrotatedIndex(
  cells: readonly {
    kind: Kind;
    rotation: number;
    solution: number;
    onRoute: boolean;
    role: Role;
  }[],
): number | null {
  const index = cells.findIndex(
    (cell) => cell.onRoute && !sameOpenings(cell.kind, cell.rotation, cell.solution),
  );
  return index < 0 ? null : index;
}
