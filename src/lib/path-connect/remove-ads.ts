import { isIosApp } from "./admob.ts";
import { RemoveAds, type RemoveAdsPurchaseStatus } from "./remove-ads-plugin.ts";

const STORAGE_KEY = "path-connect-remove-ads";

/** App Store non-consumable. Create this product in App Store Connect for $2.99. */
export const REMOVE_ADS_PRODUCT_ID = "remove_ads";

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

/**
 * On iOS this starts the App Store purchase for `remove_ads`.
 * The website has no store, so confirming there still saves the same local flag.
 */
export async function purchaseRemoveAds(): Promise<RemoveAdsPurchaseStatus> {
  if (!isIosApp()) {
    writeAdsRemoved();
    return "purchased";
  }
  try {
    const { status } = await RemoveAds.purchase({ productId: REMOVE_ADS_PRODUCT_ID });
    if (status === "purchased") writeAdsRemoved();
    return status;
  } catch {
    return "unavailable";
  }
}

/** Turns the local flag on when the App Store still entitles this player. */
export async function restoreRemoveAds(): Promise<boolean> {
  if (!isIosApp()) return readAdsRemoved();
  try {
    const { owned } = await RemoveAds.owned({ productId: REMOVE_ADS_PRODUCT_ID });
    if (owned) writeAdsRemoved();
  } catch {
    // Keep the flag already stored on this device.
  }
  return readAdsRemoved();
}
