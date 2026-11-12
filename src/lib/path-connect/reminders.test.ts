import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HINT_NUDGE_SECONDS,
  dailyReminderVisible,
  hintNudgeVisible,
  hintTurnLimit,
  shouldOfferHintNudge,
} from "./reminders.ts";

const quiet = {
  campaign: true,
  playing: true,
  hintsUsed: 0,
  offered: false,
  seconds: 0,
  turns: 0,
  par: 8,
};

describe("stuck-level hint reminder", () => {
  it("waits through ordinary play", () => {
    assert.equal(shouldOfferHintNudge(quiet), false);
    assert.equal(shouldOfferHintNudge({ ...quiet, seconds: HINT_NUDGE_SECONDS - 1, turns: 15 }), false);
  });

  it("offers after two and a half minutes or a high turn count", () => {
    assert.equal(shouldOfferHintNudge({ ...quiet, seconds: HINT_NUDGE_SECONDS }), true);
    assert.equal(shouldOfferHintNudge({ ...quiet, turns: hintTurnLimit(8) }), true);
    assert.equal(hintTurnLimit(3), 16);
    assert.equal(hintTurnLimit(40), 40);
    assert.equal(shouldOfferHintNudge({ ...quiet, par: 40, turns: 39 }), false);
  });

  it("stays off the daily, after a hint, and after it has already been offered", () => {
    assert.equal(shouldOfferHintNudge({ ...quiet, campaign: false, seconds: 400 }), false);
    assert.equal(shouldOfferHintNudge({ ...quiet, playing: false, turns: 40 }), false);
    assert.equal(shouldOfferHintNudge({ ...quiet, hintsUsed: 1, seconds: 400 }), false);
    assert.equal(shouldOfferHintNudge({ ...quiet, offered: true, seconds: 400 }), false);
  });

  it("keeps the prompt up once, until a hint is used", () => {
    assert.equal(hintNudgeVisible({ campaign: true, playing: true, hintsUsed: 0, offered: true }), true);
    assert.equal(hintNudgeVisible({ campaign: true, playing: true, hintsUsed: 0, offered: false }), false);
    assert.equal(hintNudgeVisible({ campaign: true, playing: true, hintsUsed: 1, offered: true }), false);
    assert.equal(hintNudgeVisible({ campaign: false, playing: true, hintsUsed: 0, offered: true }), false);
    assert.equal(hintNudgeVisible({ campaign: true, playing: false, hintsUsed: 0, offered: true }), false);
  });
});

describe("daily reminder", () => {
  it("shows on the campaign screen until today is finished", () => {
    assert.equal(dailyReminderVisible({ onCampaign: true, statsReady: true, completed: false }), true);
    assert.equal(dailyReminderVisible({ onCampaign: true, statsReady: true, completed: true }), false);
    assert.equal(dailyReminderVisible({ onCampaign: false, statsReady: true, completed: false }), false);
    assert.equal(dailyReminderVisible({ onCampaign: true, statsReady: false, completed: false }), false);
  });
});
