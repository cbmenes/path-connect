/**
 * Interstitial breaks follow the completed campaign level, so the schedule
 * stays the same if a player replays a board or jumps ahead.
 *
 * Levels 1–10 never break. Levels 11–40 break every third completion
 * (13, 16, 19 … 40). From 41 on, every even level breaks (42, 44, 46 …).
 */
export function interstitialAfterLevel(levelId: number): boolean {
  if (!Number.isInteger(levelId) || levelId <= 10) return false;
  if (levelId <= 40) return (levelId - 10) % 3 === 0;
  return levelId % 2 === 0;
}

/** A Remove Ads purchase turns every interstitial off. Hint ads are separate. */
export function shouldShowInterstitial(levelId: number, adsRemoved: boolean): boolean {
  if (adsRemoved) return false;
  return interstitialAfterLevel(levelId);
}
