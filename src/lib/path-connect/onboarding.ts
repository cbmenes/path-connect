/**
 * The short "how power works" lesson. It shows once, to a player with no saved
 * progress, and never again after it is finished or skipped.
 */
const STORAGE_KEY = "path-connect-onboarded";
const PROGRESS_KEY = "path-connect-progress";

type Store = Pick<Storage, "getItem" | "setItem">;

function store(): Store | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export function needsOnboarding(storage: Store | null = store()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(STORAGE_KEY) === null && storage.getItem(PROGRESS_KEY) === null;
  } catch {
    return false;
  }
}

export function markOnboarded(storage: Store | null = store()): void {
  try {
    storage?.setItem(STORAGE_KEY, "1");
  } catch {
    // Private browsing can refuse storage. The lesson then shows once per visit.
  }
}

/** The "Flow starts from the house" tip on level 1. It shows until the player turns a tile or leaves the level. */
const SOURCE_TIP_KEY = "path-connect-source-tip";

export function needsSourceTip(storage: Store | null = store()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(SOURCE_TIP_KEY) === null;
  } catch {
    return false;
  }
}

export function markSourceTipSeen(storage: Store | null = store()): void {
  try {
    storage?.setItem(SOURCE_TIP_KEY, "1");
  } catch {
    // Same as the lesson: without storage the tip can come back next visit.
  }
}
