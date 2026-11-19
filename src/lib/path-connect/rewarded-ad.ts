import { isAndroidApp, isIosApp, showAndroidRewarded, showIosRewarded } from "./admob.ts";

export type AdOutcome = "rewarded" | "dismissed" | "unavailable";

/**
 * Swap point for a real rewarded-ad network. `show` resolves "rewarded" only
 * when the player watched to the end. Anything else gives no reward.
 */
export interface RewardedAdProvider {
  /** True when this provider plays a stand-in instead of a real ad. */
  readonly placeholder: boolean;
  /** Seconds the stand-in plays before it rewards. */
  readonly placeholderSeconds: number;
  show(signal: AbortSignal): Promise<AdOutcome>;
}

/** Plays a labeled stand-in, so the gated hint flow works before ads exist. */
export const placeholderAds: RewardedAdProvider = {
  placeholder: true,
  placeholderSeconds: 5,
  show(signal) {
    return new Promise((resolve) => {
      if (signal.aborted) return resolve("dismissed");
      const id = setTimeout(() => resolve("rewarded"), this.placeholderSeconds * 1000);
      signal.addEventListener("abort", () => {
        clearTimeout(id);
        resolve("dismissed");
      });
    });
  },
};

/** iOS and Android request their live rewarded units. The web build keeps the stand-in. */
export const rewardedAds: RewardedAdProvider = {
  get placeholder() {
    return !isIosApp() && !isAndroidApp();
  },
  placeholderSeconds: placeholderAds.placeholderSeconds,
  show(signal) {
    if (isIosApp()) return showIosRewarded(signal);
    if (isAndroidApp()) return showAndroidRewarded(signal);
    return placeholderAds.show(signal);
  },
};
