/** Campaign progress on this device: the level in play and the furthest level opened. */
export interface Progress {
  level: number;
  unlocked: number;
}

const STORAGE_KEY = "path-connect-progress";

export const START: Progress = { level: 1, unlocked: 1 };

/** Testing switch: every level can be picked, while `unlocked` keeps tracking real progress for the solved marks. */
export const ALL_LEVELS_OPEN = true;

export function readProgress(count: number, { openAll = false } = {}): Progress {
  if (typeof localStorage === "undefined") return START;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return START;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const unlocked = clamp(Number(parsed.unlocked), 1, count);
    const level = clamp(Number(parsed.level), 1, openAll ? count : unlocked);
    return { level, unlocked };
  } catch {
    return START;
  }
}

export function writeProgress(progress: Progress): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing can refuse storage. Progress then lasts for this visit only.
  }
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.min(high, Math.max(low, Math.floor(value)));
}
