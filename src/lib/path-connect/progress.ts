/** Campaign progress on this device: the level in play and the furthest level opened. */
export interface Progress {
  level: number;
  unlocked: number;
}

const STORAGE_KEY = "path-connect-progress";
const DEV_UNLOCK_KEY = "devUnlockAll";

export const START: Progress = { level: 1, unlocked: 1 };

/** Sequential campaign. Level 1 starts open, and beating a level opens the next one. */
export const ALL_LEVELS_OPEN = false;

/** Hidden per-device switch. Only the exact string "true" opens every level. */
export function devUnlockAll(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(DEV_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * `?dev=unlock-all` stores the hidden switch and leaves the address without that parameter.
 * Any other query or hash stays put. A missing or refused store still drops the parameter.
 */
export function captureDevUnlock(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("dev") !== "unlock-all") return;
  try {
    localStorage.setItem(DEV_UNLOCK_KEY, "true");
  } catch {
    // The parameter is still removed, so the address does not keep the switch visible.
  }
  url.searchParams.delete("dev");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

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
