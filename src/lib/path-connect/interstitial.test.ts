import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { interstitialAds } from "./interstitial-ad.ts";
import { interstitialAfterLevel, shouldShowInterstitial } from "./interstitial.ts";
import { readAdsRemoved, writeAdsRemoved } from "./remove-ads.ts";

describe("interstitial schedule", () => {
  it("stays quiet through level 10", () => {
    for (let level = 1; level <= 10; level++) {
      assert.equal(interstitialAfterLevel(level), false, `level ${level}`);
    }
  });

  it("breaks every third completion from 11 through 40", () => {
    const shown: number[] = [];
    for (let level = 11; level <= 40; level++) {
      if (interstitialAfterLevel(level)) shown.push(level);
    }
    assert.deepEqual(shown, [13, 16, 19, 22, 25, 28, 31, 34, 37, 40]);
  });

  it("breaks every second completion from 41 on", () => {
    const shown: number[] = [];
    for (let level = 41; level <= 50; level++) {
      if (interstitialAfterLevel(level)) shown.push(level);
    }
    assert.deepEqual(shown, [42, 44, 46, 48, 50]);
    assert.equal(interstitialAfterLevel(41), false);
    assert.equal(interstitialAfterLevel(250), true);
    assert.equal(interstitialAfterLevel(249), false);
  });

  it("skips the break after Remove Ads", () => {
    assert.equal(shouldShowInterstitial(13, false), true);
    assert.equal(shouldShowInterstitial(13, true), false);
    assert.equal(shouldShowInterstitial(42, true), false);
    assert.equal(shouldShowInterstitial(12, false), false);
  });
});

describe("remove ads purchase", () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("starts unsold and stays sold after a restart", () => {
    assert.equal(readAdsRemoved(), false);
    const data = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    assert.equal(readAdsRemoved(), false);
    writeAdsRemoved();
    writeAdsRemoved();
    assert.equal(readAdsRemoved(), true);
    assert.equal(data.get("path-connect-remove-ads"), "1");
  });

  it("treats damaged storage as unsold", () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(readAdsRemoved(), false);
    assert.doesNotThrow(() => writeAdsRemoved());
  });
});

describe("interstitial placeholder", () => {
  it("logs the completed level", () => {
    const lines: unknown[][] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      lines.push(args);
    };
    try {
      interstitialAds.show(16);
    } finally {
      console.info = original;
    }
    assert.equal(interstitialAds.placeholder, true);
    assert.match(String(lines[0]?.[0]), /after level 16/);
  });
});
