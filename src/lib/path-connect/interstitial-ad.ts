import { isIosApp, showIosInterstitial } from "./admob.ts";

/**
 * Swap point for a real interstitial network. `show` runs when the schedule
 * says a break should play, after the win feedback and before the next level.
 */
export interface InterstitialAd {
  /** True when this provider only logs and the screen shows a stand-in. */
  readonly placeholder: boolean;
  show(levelId: number): void | Promise<void>;
}

/** Logs the level and lets the screen show a labeled stand-in. */
export const placeholderInterstitial: InterstitialAd = {
  placeholder: true,
  show(levelId) {
    console.info(`Interstitial would show after level ${levelId}.`);
  },
};

/** iOS requests the live interstitial unit. Everywhere else keeps the stand-in. */
export const interstitialAds: InterstitialAd = {
  get placeholder() {
    return !isIosApp();
  },
  show(levelId) {
    if (!isIosApp()) {
      placeholderInterstitial.show(levelId);
      return;
    }
    return showIosInterstitial();
  },
};
