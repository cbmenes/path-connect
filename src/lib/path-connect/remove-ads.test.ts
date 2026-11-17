import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { REMOVE_ADS_PRICE, REMOVE_ADS_PRODUCT_ID, purchaseRemoveAds, readAdsRemoved } from "./remove-ads.ts";

describe("remove ads product", () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("is the non-consumable App Store product at $2.99", () => {
    assert.equal(REMOVE_ADS_PRODUCT_ID, "remove_ads");
    assert.equal(REMOVE_ADS_PRICE, "$2.99");
  });

  it("saves the same local flag when the App Store is not present", async () => {
    const data = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    assert.equal(await purchaseRemoveAds(), "purchased");
    assert.equal(readAdsRemoved(), true);
    assert.equal(data.get("path-connect-remove-ads"), "1");
  });
});
