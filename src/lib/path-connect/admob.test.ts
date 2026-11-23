import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMOB_IOS_APP_ID,
  ADMOB_IOS_INTERSTITIAL_ID,
  ADMOB_IOS_REWARDED_ID,
  ADMOB_ANDROID_APP_ID,
  ADMOB_ANDROID_INTERSTITIAL_ID,
  ADMOB_ANDROID_REWARDED_ID,
  androidInterstitialRequest,
  androidRewardedRequest,
  isAndroidApp,
  iosInterstitialRequest,
  iosRewardedRequest,
  isIosApp,
} from "./admob.ts";
import { interstitialAds } from "./interstitial-ad.ts";
import { rewardedAds } from "./rewarded-ad.ts";

describe("iOS AdMob units", () => {
  it("uses the live application id and ad units", () => {
    assert.equal(ADMOB_IOS_APP_ID, "ca-app-pub-6994670649862950~9651422362");
    assert.equal(ADMOB_IOS_INTERSTITIAL_ID, "ca-app-pub-6994670649862950/1637200978");
    assert.equal(ADMOB_IOS_REWARDED_ID, "ca-app-pub-6994670649862950/5666724137");
  });

  it("requests those units with testing turned off", () => {
    assert.deepEqual(iosInterstitialRequest(), {
      adId: "ca-app-pub-6994670649862950/1637200978",
      isTesting: false,
    });
    assert.deepEqual(iosRewardedRequest(), {
      adId: "ca-app-pub-6994670649862950/5666724137",
      isTesting: false,
    });
  });

  it("keeps the stand-in outside the native apps", () => {
    assert.equal(isIosApp(), false);
    assert.equal(isAndroidApp(), false);
    assert.equal(interstitialAds.placeholder, true);
    assert.equal(rewardedAds.placeholder, true);
  });
});

describe("Android AdMob units", () => {
  it("uses the live Android application id and ad units", () => {
    assert.equal(ADMOB_ANDROID_APP_ID, "ca-app-pub-6994670649862950~4753875369");
    assert.equal(ADMOB_ANDROID_INTERSTITIAL_ID, "ca-app-pub-6994670649862950/9006826040");
    assert.equal(ADMOB_ANDROID_REWARDED_ID, "ca-app-pub-6994670649862950/4266790200");
  });

  it("requests those units with testing turned off", () => {
    assert.deepEqual(androidInterstitialRequest(), {
      adId: "ca-app-pub-6994670649862950/9006826040",
      isTesting: false,
    });
    assert.deepEqual(androidRewardedRequest(), {
      adId: "ca-app-pub-6994670649862950/4266790200",
      isTesting: false,
    });
  });
});
