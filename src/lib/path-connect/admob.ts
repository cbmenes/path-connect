import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Options the AdMob plugin accepts when loading an ad.
 * Kept local so the web build does not import `@capacitor-community/admob`.
 * That package's JavaScript entry fails to resolve during the Android sync build.
 * The native plugin is still installed, and these calls use its `AdMob` bridge.
 */
export interface AdOptions {
  adId: string;
  isTesting?: boolean;
}

export interface RewardAdOptions extends AdOptions {}

interface PreparedAd {
  adUnitId: string;
}

interface AdMobPlugin {
  initialize(options: { initializeForTesting?: boolean }): Promise<void>;
  prepareInterstitial(options: AdOptions): Promise<PreparedAd>;
  showInterstitial(options: { adId: string }): Promise<void>;
  prepareRewardVideoAd(options: RewardAdOptions): Promise<PreparedAd>;
  showRewardVideoAd(options: { adId: string }): Promise<void>;
  addListener(eventName: string, listenerFunc: () => void): Promise<PluginListenerHandle>;
}

const AdMob = registerPlugin<AdMobPlugin>("AdMob");

/** Same event names the AdMob plugin emits for a full-screen interstitial. */
const INTERSTITIAL_DISMISSED = "interstitialAdDismissed";
const INTERSTITIAL_FAILED_TO_SHOW = "interstitialAdFailedToShow";

/** Read by the iOS Google Mobile Ads SDK from Info.plist when AdMob.initialize runs. */
export const ADMOB_IOS_APP_ID = "ca-app-pub-6994670649862950~9651422362";

export const ADMOB_IOS_INTERSTITIAL_ID = "ca-app-pub-6994670649862950/1637200978";

export const ADMOB_IOS_REWARDED_ID = "ca-app-pub-6994670649862950/5666724137";

/** Read by the Android Google Mobile Ads SDK from AndroidManifest.xml (`com.google.android.gms.ads.APPLICATION_ID`). */
export const ADMOB_ANDROID_APP_ID = "ca-app-pub-6994670649862950~4753875369";

export const ADMOB_ANDROID_INTERSTITIAL_ID = "ca-app-pub-6994670649862950/9006826040";

export const ADMOB_ANDROID_REWARDED_ID = "ca-app-pub-6994670649862950/4266790200";

/** Production requests. A testing flag would swap these units for Google's sample ads. */
export function iosInterstitialRequest(): AdOptions {
  return { adId: ADMOB_IOS_INTERSTITIAL_ID, isTesting: false };
}

export function iosRewardedRequest(): RewardAdOptions {
  return { adId: ADMOB_IOS_REWARDED_ID, isTesting: false };
}

export function androidInterstitialRequest(): AdOptions {
  return { adId: ADMOB_ANDROID_INTERSTITIAL_ID, isTesting: false };
}

export function androidRewardedRequest(): RewardAdOptions {
  return { adId: ADMOB_ANDROID_REWARDED_ID, isTesting: false };
}

/** Android uses its own units. Everything else that reaches AdMob is iOS. */
function interstitialRequest(): AdOptions {
  return isAndroidApp() ? androidInterstitialRequest() : iosInterstitialRequest();
}

function rewardedRequest(): RewardAdOptions {
  return isAndroidApp() ? androidRewardedRequest() : iosRewardedRequest();
}

export function isIosApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

/** True in the native iOS or Android app, where real AdMob units play. */
export function isAdMobApp(): boolean {
  return isIosApp() || isAndroidApp();
}

let starting: Promise<void> | null = null;

/**
 * Starts the Google Mobile Ads SDK once. On iOS the SDK takes its application
 * id from Info.plist (`GADApplicationIdentifier` = `ADMOB_IOS_APP_ID`), and on
 * Android from AndroidManifest.xml (`ADMOB_ANDROID_APP_ID`).
 */
export function ensureAdMob(): Promise<void> {
  if (!starting) {
    starting = (async () => {
      try {
        await AdMob.initialize({ initializeForTesting: false });
      } catch (error) {
        starting = null;
        throw error;
      }
    })();
  }
  return starting;
}

/** Loads and presents this platform's interstitial, then resolves when it closes or cannot play. */
export async function showAdMobInterstitial(): Promise<void> {
  await ensureAdMob();
  const request = interstitialRequest();
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
  const dismissed = await AdMob.addListener(INTERSTITIAL_DISMISSED, finish);
  const failed = await AdMob.addListener(INTERSTITIAL_FAILED_TO_SHOW, finish);
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

/** Loads and presents this platform's rewarded ad. A reward is granted only after the ad completes. */
export async function showAdMobRewarded(signal: AbortSignal): Promise<"rewarded" | "dismissed" | "unavailable"> {
  if (signal.aborted) return "dismissed";
  try {
    await ensureAdMob();
    if (signal.aborted) return "dismissed";
    const { adUnitId } = await AdMob.prepareRewardVideoAd(rewardedRequest());
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
