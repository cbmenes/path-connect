/** A campaign level counts as stuck after about two and a half minutes. */
export const HINT_NUDGE_SECONDS = 150;

/**
 * Or after this many turns, and never before the board's own par, so a long
 * level is not nudged while the player is still on pace.
 */
export const HINT_NUDGE_TURN_FLOOR = 16;

export function hintTurnLimit(par: number): number {
  const planned = Number.isFinite(par) ? Math.max(0, Math.floor(par)) : 0;
  return Math.max(HINT_NUDGE_TURN_FLOOR, planned);
}

export function shouldOfferHintNudge(input: {
  campaign: boolean;
  playing: boolean;
  hintsUsed: number;
  offered: boolean;
  seconds: number;
  turns: number;
  par: number;
}): boolean {
  if (!input.campaign || !input.playing || input.offered || input.hintsUsed > 0) return false;
  return input.seconds >= HINT_NUDGE_SECONDS || input.turns >= hintTurnLimit(input.par);
}

/** The offer stays up until a hint is used. It is not repeated on the Daily. */
export function hintNudgeVisible(input: {
  campaign: boolean;
  playing: boolean;
  hintsUsed: number;
  offered: boolean;
}): boolean {
  return input.campaign && input.playing && input.offered && input.hintsUsed === 0;
}

/** A quiet line by the Daily button while today's board is still open. */
export function dailyReminderVisible(input: {
  onCampaign: boolean;
  statsReady: boolean;
  completed: boolean;
}): boolean {
  return input.onCampaign && input.statsReady && !input.completed;
}
