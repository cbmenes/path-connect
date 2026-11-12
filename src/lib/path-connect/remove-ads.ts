const STORAGE_KEY = "path-connect-remove-ads";

/** One-time purchase. The store is not connected yet; confirming saves it here. */
export const REMOVE_ADS_PRICE = "$2.99";

export function readAdsRemoved(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records the purchase on this device. A second call leaves it purchased. */
export function writeAdsRemoved(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private browsing can refuse storage. The session still treats it as purchased.
  }
}
