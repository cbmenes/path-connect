import { LEVELS, boardCells, type Level } from "./levels.ts";
import { reachTargets, sameOpenings } from "./logic.ts";

/** Shared clock for the daily board. Seconds left when you finish is the score. */
export const DAILY_SECONDS = 120;

export interface DailyScore {
  secondsLeft: number;
  turns: number;
}

const STORAGE_KEY = "path-connect-daily-best";

/** UTC day, so every player gets the same board on the same calendar date. */
export function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function formatDailyDate(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(now);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** More time left wins. The same time left prefers fewer turns. */
export function isBetterScore(next: DailyScore, best: DailyScore | null): boolean {
  if (!best) return true;
  if (next.secondsLeft !== best.secondsLeft) return next.secondsLeft > best.secondsLeft;
  return next.turns < best.turns;
}

export function dailyLevel(now: Date): Level {
  const key = dateKey(now);
  const day = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
  const base = LEVELS[day % LEVELS.length]!;
  const rand = mulberry32(hash(key));
  const tiles = base.tiles.map((tile) => ({ ...tile }));

  for (const tile of tiles) {
    if (tile.role !== "play") continue;
    let offset = 1 + Math.floor(rand() * 3);
    if (sameOpenings(tile.kind, tile.solution, tile.solution + offset)) offset = 1;
    tile.initial = (tile.solution + offset) % 4;
  }

  let guard = 0;
  while (reachTargets(boardCells(draft(base, tiles), tiles.map((tile) => tile.initial))).complete && guard < 80) {
    const fillers = tiles.filter((tile) => tile.role === "play" && !tile.onRoute);
    const tile = fillers[guard % fillers.length];
    if (!tile) break;
    tile.initial = (tile.initial + 1) % 4;
    guard += 1;
  }

  return draft(base, tiles);
}

export function readBest(key: string): DailyScore | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, DailyScore>;
    const score = parsed[key];
    if (!score || !Number.isFinite(score.secondsLeft) || !Number.isFinite(score.turns)) return null;
    return { secondsLeft: score.secondsLeft, turns: score.turns };
  } catch {
    return null;
  }
}

export function writeBest(key: string, score: DailyScore): void {
  if (typeof localStorage === "undefined") return;
  let parsed: Record<string, DailyScore> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw) as Record<string, DailyScore>;
  } catch {
    parsed = {};
  }
  parsed[key] = score;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}

function draft(base: Level, tiles: Level["tiles"]): Level {
  return {
    ...base,
    name: "Daily challenge",
    blurb: "Same garden for everyone today. Water every plant before the clock runs out.",
    tiles,
  };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), state | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
