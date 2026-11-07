import { generateDaily, type Level } from "./levels.ts";

export interface DailyRun {
  seconds: number;
  turns: number;
}

/** Personal bests across every Daily, plus the latest finish for each date. */
export interface DailyStats {
  bestSeconds: number | null;
  bestTurns: number | null;
  days: Record<string, DailyRun>;
}

export interface DailyFinish {
  run: DailyRun;
  stats: DailyStats;
  /** False for a replay of a day already finished, which is practice only. */
  counted: boolean;
  newBestTime: boolean;
  newBestTurns: boolean;
}

const STORAGE_KEY = "path-connect-daily-stats";

export const EMPTY_STATS: DailyStats = { bestSeconds: null, bestTurns: null, days: {} };

/** UTC day, so every player gets the same board on the same calendar date. */
export function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dayNumber(key: string): number {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
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

export function dailyLevel(now: Date): Level {
  return generateDaily(dayNumber(dateKey(now)));
}

/**
 * Time and turns are separate records, so each one can improve on its own.
 * Only the first finish of a day counts. A replay already knows the answer.
 */
export function recordFinish(stats: DailyStats, key: string, run: DailyRun): DailyFinish {
  if (stats.days[key]) return { run, stats, counted: false, newBestTime: false, newBestTurns: false };
  const newBestTime = stats.bestSeconds === null || run.seconds < stats.bestSeconds;
  const newBestTurns = stats.bestTurns === null || run.turns < stats.bestTurns;
  return {
    run,
    stats: {
      bestSeconds: newBestTime ? run.seconds : stats.bestSeconds,
      bestTurns: newBestTurns ? run.turns : stats.bestTurns,
      days: { ...stats.days, [key]: run },
    },
    counted: true,
    newBestTime,
    newBestTurns,
  };
}

/** Whole hours and minutes until the next UTC midnight, such as "5 h 12 m". */
export function untilNextDaily(now: Date): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const minutes = Math.max(1, Math.ceil((next - now.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} m` : `${minutes} m`;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

export function parseStats(raw: string | null): DailyStats {
  if (!raw) return EMPTY_STATS;
  try {
    const parsed = JSON.parse(raw) as Partial<DailyStats>;
    const days: Record<string, DailyRun> = {};
    for (const [key, run] of Object.entries(parsed.days ?? {})) {
      const seconds = count(run?.seconds);
      const turns = count(run?.turns);
      if (seconds !== null && turns !== null) days[key] = { seconds, turns };
    }
    return { bestSeconds: count(parsed.bestSeconds), bestTurns: count(parsed.bestTurns), days };
  } catch {
    return EMPTY_STATS;
  }
}

export function readStats(): DailyStats {
  if (typeof localStorage === "undefined") return EMPTY_STATS;
  try {
    return parseStats(localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_STATS;
  }
}

export function writeStats(stats: DailyStats): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage can be full or blocked. The run still shows its result.
  }
}
