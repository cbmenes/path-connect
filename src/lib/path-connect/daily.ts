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
  /** Consecutive finished days, ending today or yesterday. A missed day stores 0. */
  streak: number;
  /** Highest streak this player has reached. */
  longest: number;
}

export interface DailyFinish {
  run: DailyRun;
  stats: DailyStats;
  /** False for a replay of a day already finished, which is practice only. */
  counted: boolean;
  newBestTime: boolean;
  newBestTurns: boolean;
  streak: number;
  longest: number;
  /** Set when this finish lands on 3, 7, 14, 30, or 100 days. A replay stays quiet. */
  milestone: number | null;
}

const STORAGE_KEY = "path-connect-daily-stats";

export const EMPTY_STATS: DailyStats = { bestSeconds: null, bestTurns: null, days: {}, streak: 0, longest: 0 };

/** Streaks that get a short note. Nothing else is awarded. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function shiftDate(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year!, (month ?? 1) - 1, (day ?? 1) + days)).toISOString().slice(0, 10);
}

/** Finished days in a row, counting back from `today`, or from yesterday if today is still open. */
export function currentStreak(days: Record<string, DailyRun>, today: string): number {
  if (!DATE_KEY.test(today)) return 0;
  let cursor = days[today] ? today : shiftDate(today, -1);
  if (!days[cursor]) return 0;
  let streak = 0;
  while (days[cursor]) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export function longestStreak(days: Record<string, DailyRun>): number {
  const keys = Object.keys(days).filter((key) => DATE_KEY.test(key)).sort();
  let best = 0;
  let run = 0;
  let previous = "";
  for (const key of keys) {
    run = previous && shiftDate(previous, 1) === key ? run + 1 : 1;
    if (run > best) best = run;
    previous = key;
  }
  return best;
}

export function streakMilestone(streak: number): number | null {
  return (STREAK_MILESTONES as readonly number[]).includes(streak) ? streak : null;
}

/** Bring the saved streak in line with the finished days. A gap stores 0 and keeps the record. */
export function settleStreak(stats: DailyStats, today: string): DailyStats {
  const streak = currentStreak(stats.days, today);
  const longest = Math.max(stats.longest || 0, longestStreak(stats.days), streak);
  if (stats.streak === streak && stats.longest === longest) return stats;
  return { ...stats, streak, longest };
}

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
  if (stats.days[key]) {
    const settled = settleStreak(stats, key);
    return {
      run,
      stats: settled,
      counted: false,
      newBestTime: false,
      newBestTurns: false,
      streak: settled.streak,
      longest: settled.longest,
      milestone: null,
    };
  }
  const newBestTime = stats.bestSeconds === null || run.seconds < stats.bestSeconds;
  const newBestTurns = stats.bestTurns === null || run.turns < stats.bestTurns;
  const next = settleStreak(
    {
      bestSeconds: newBestTime ? run.seconds : stats.bestSeconds,
      bestTurns: newBestTurns ? run.turns : stats.bestTurns,
      days: { ...stats.days, [key]: run },
      streak: stats.streak || 0,
      longest: stats.longest || 0,
    },
    key,
  );
  return {
    run,
    stats: next,
    counted: true,
    newBestTime,
    newBestTurns,
    streak: next.streak,
    longest: next.longest,
    milestone: streakMilestone(next.streak),
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
    return {
      bestSeconds: count(parsed.bestSeconds),
      bestTurns: count(parsed.bestTurns),
      days,
      streak: count(parsed.streak) ?? 0,
      longest: count(parsed.longest) ?? 0,
    };
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
