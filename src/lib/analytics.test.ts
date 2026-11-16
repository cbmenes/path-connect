import assert from "node:assert/strict";
import test from "node:test";
import {
  GA_MEASUREMENT_ID,
  GA_SCRIPT_SRC,
  gaBootstrap,
  installAnalytics,
  loadAnalyticsScript,
  track,
  trackDailyPlayed,
  trackHintUsed,
  trackLevelComplete,
  trackLevelStart,
} from "./analytics.ts";

test("the tag points at the Path Connect property", () => {
  assert.equal(GA_MEASUREMENT_ID, "G-JXCS90M1KC");
  assert.equal(GA_SCRIPT_SRC, "https://www.googletagmanager.com/gtag/js?id=G-JXCS90M1KC");
  assert.match(gaBootstrap(), /gtag\('config','G-JXCS90M1KC'\)/);
});

test("a missing tag does not throw", () => {
  const previous = globalThis.window;
  globalThis.window = {} as Window & typeof globalThis;
  assert.doesNotThrow(() => trackLevelStart(3));
  globalThis.window = previous;
});

test("level, hint, and daily events use stable names", () => {
  const beacons: string[] = [];
  const previousWindow = globalThis.window;
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.window = {} as Window & typeof globalThis;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: { cookie: "_ga=GA1.1.42.7", title: "Path Connect" },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      sendBeacon(url: string) {
        beacons.push(String(url));
        return true;
      },
    },
  });
  try {
    trackLevelStart(4);
    trackLevelComplete(4);
    trackHintUsed("levels", 4);
    trackHintUsed("daily", 12);
    trackDailyPlayed();
    track("level_start", { level: 1 });
    const names = beacons.map((url) => new URL(url).searchParams.get("en"));
    assert.deepEqual(names, [
      "level_start",
      "level_complete",
      "hint_used",
      "hint_used",
      "daily_puzzle_played",
      "level_start",
    ]);
    const first = new URL(beacons[0] ?? "");
    assert.equal(first.searchParams.get("tid"), GA_MEASUREMENT_ID);
    assert.equal(first.searchParams.get("epn.level"), "4");
    assert.equal(first.searchParams.get("cid"), "42.7");
    const hint = new URL(beacons[2] ?? "");
    assert.equal(hint.searchParams.get("ep.mode"), "levels");
  } finally {
    globalThis.window = previousWindow;
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete (globalThis as { document?: unknown }).document;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete (globalThis as { navigator?: unknown }).navigator;
  }
});

test("install configures the property once and does not replace an existing tag", () => {
  const calls: unknown[][] = [];
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = {
    gtag: (...args: unknown[]) => {
      calls.push(args);
    },
    dataLayer: [],
  } as unknown as Window & typeof globalThis;
  let created = 0;
  let selector = "";
  globalThis.document = {
    querySelector: (value: string) => {
      selector = value;
      return null;
    },
    head: { appendChild() {} },
    createElement: () => {
      created += 1;
      return {};
    },
  } as unknown as Document;
  try {
    installAnalytics();
    installAnalytics();
    loadAnalyticsScript();
    assert.equal(calls.filter((call) => call[0] === "config").length, 1);
    assert.equal(calls.find((call) => call[0] === "config")?.[1], GA_MEASUREMENT_ID);
    assert.equal(created, 1);
    assert.match(selector, /G-JXCS90M1KC/);
    created = 0;
    globalThis.document = {
      querySelector: () => ({}),
      head: { appendChild() {} },
      createElement: () => {
        created += 1;
        return {};
      },
    } as unknown as Document;
    loadAnalyticsScript();
    assert.equal(created, 0);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
