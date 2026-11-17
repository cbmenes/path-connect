import { Capacitor } from "@capacitor/core";
import type { AdOptions, RewardAdOptions } from "@capacitor-community/admob";

/** Read by the iOS Google Mobile Ads SDK from Info.plist when AdMob.initialize runs. */
export const ADMOB_IOS_APP_ID = "ca-app-pub-6994670649862950~9651422362";

export const ADMOB_IOS_INTERSTITIAL_ID = "ca-app-pub-6994670649862950/1637200978";

export const ADMOB_IOS_REWARDED_ID = "ca-app-pub-6994670649862950/5666724137";

/** Production requests. A testing flag would swap these units for Google's sample ads. */
export function iosInterstitialRequest(): AdOptions {
  return { adId: ADMOB_IOS_INTERSTITIAL_ID, isTesting: false };
}

export function iosRewardedRequest(): RewardAdOptions {
  return { adId: ADMOB_IOS_REWARDED_ID, isTesting: false };
}

export function isIosApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

let starting: Promise<void> | null = null;

/**
 * Starts the Google Mobile Ads SDK once. On iOS the SDK takes its application
 * id from Info.plist (`GADApplicationIdentifier` = `ADMOB_IOS_APP_ID`).
 */
export function ensureIosAdMob(): Promise<void> {
  if (!starting) {
    starting = (async () => {
      try {
        const { AdMob } = await import("@capacitor-community/admob");
        await AdMob.initialize({ initializeForTesting: false });
      } catch (error) {
        starting = null;
        throw error;
      }
    })();
  }
  return starting;
}

/** Loads and presents the iOS interstitial, then resolves when it closes or cannot play. */
export async function showIosInterstitial(): Promise<void> {
  const { AdMob, InterstitialAdPluginEvents } = await import("@capacitor-community/admob");
  await ensureIosAdMob();
  const request = iosInterstitialRequest();
  let closed!: () => void;
  const done = new Promise<void>((resolve) => {
    closed = resolve;
  });
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    closed();
  };
  const dismissed = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish);
  const failed = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish);
  try {
    const { adUnitId } = await AdMob.prepareInterstitial(request);
    await AdMob.showInterstitial({ adId: adUnitId });
    await done;
  } catch {
    finish();
  } finally {
    void dismissed.remove();
    void failed.remove();
  }
}

function adError(error: unknown): { message: string; code: string } {
  if (typeof error === "string") return { message: error, code: "" };
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; code?: unknown };
    return {
      message: typeof record.message === "string" ? record.message : "",
      code: record.code === undefined || record.code === null ? "" : String(record.code),
    };
  }
  return { message: "", code: "" };
}

/** Loads and presents the iOS rewarded ad. A reward is granted only after the ad completes. */
export async function showIosRewarded(signal: AbortSignal): Promise<"rewarded" | "dismissed" | "unavailable"> {
  if (signal.aborted) return "dismissed";
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await ensureIosAdMob();
    if (signal.aborted) return "dismissed";
    const { adUnitId } = await AdMob.prepareRewardVideoAd(iosRewardedRequest());
    if (signal.aborted) return "dismissed";
    await AdMob.showRewardVideoAd({ adId: adUnitId });
    return signal.aborted ? "dismissed" : "rewarded";
  } catch (error) {
    const { message, code } = adError(error);
    if (code === "REWARDED_AD_CANCELLED" || message.includes("dismissed before earning")) return "dismissed";
    if (signal.aborted) return "dismissed";
    return "unavailable";
  }
}
