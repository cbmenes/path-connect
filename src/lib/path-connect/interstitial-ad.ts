/**
 * Swap point for a real interstitial network. `show` runs when the schedule
 * says a break should play, after the win feedback and before the next level.
 */
export interface InterstitialAd {
  /** True when this provider only logs and the screen shows a stand-in. */
  readonly placeholder: boolean;
  show(levelId: number): void;
}

/** Logs the level and lets the screen show a labeled stand-in. */
export const placeholderInterstitial: InterstitialAd = {
  placeholder: true,
  show(levelId) {
    console.info(`Interstitial would show after level ${levelId}.`);
  },
};

export const interstitialAds: InterstitialAd = placeholderInterstitial;
