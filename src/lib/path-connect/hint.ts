import type { Level } from "./levels.ts";
import { sameOpenings } from "./logic.ts";

export interface Hint {
  index: number;
  /** Clockwise taps that bring this tile to its solved openings, 1 to 3. */
  turns: number;
}

/** One free hint per board, then one more behind a rewarded ad. */
export const FREE_HINTS = 1;
export const MAX_HINTS = 2;

export type HintOffer = "free" | "ad" | "none";

export function hintOffer(used: number): HintOffer {
  if (used < FREE_HINTS) return "free";
  if (used < MAX_HINTS) return "ad";
  return "none";
}

export function turnsToSolve(kind: Level["tiles"][number]["kind"], spin: number, solution: number): number {
  for (let turns = 0; turns < 4; turns++) {
    if (sameOpenings(kind, spin + turns, solution)) return turns;
  }
  return 0;
}

/**
 * The first route tile, walking out from the source, that is still turned
 * the wrong way. Fixing it extends the lit run by one piece and reveals
 * nothing past it.
 */
export function pickHint(level: Level, spins: readonly number[]): Hint | null {
  const order = [...level.solutionPath];
  for (const [index, tile] of level.tiles.entries()) {
    if (tile.onRoute && !order.includes(index)) order.push(index);
  }
  for (const index of order) {
    const tile = level.tiles[index];
    if (!tile || tile.fixed) continue;
    const turns = turnsToSolve(tile.kind, spins[index] ?? tile.initial, tile.solution);
    if (turns > 0) return { index, turns };
  }
  return null;
}
