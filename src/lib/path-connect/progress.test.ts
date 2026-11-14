import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ALL_LEVELS_OPEN, START, captureDevUnlock, devUnlockAll, readProgress, writeProgress } from "./progress.ts";

function useStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("campaign progress", () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { window?: unknown }).window;
  });

  it("starts locked to level one", () => {
    assert.equal(ALL_LEVELS_OPEN, false);
  });

  it("starts at level one without storage", () => {
    assert.deepEqual(readProgress(60), START);
    useStorage();
    assert.deepEqual(readProgress(60), START);
  });

  it("round-trips the current and furthest level", () => {
    useStorage();
    writeProgress({ level: 12, unlocked: 13 });
    assert.deepEqual(readProgress(60), { level: 12, unlocked: 13 });
  });

  it("never opens a level past the furthest one reached", () => {
    useStorage({ "path-connect-progress": JSON.stringify({ level: 40, unlocked: 14 }) });
    assert.deepEqual(readProgress(60), { level: 14, unlocked: 14 });
    useStorage({ "path-connect-progress": JSON.stringify({ level: 3, unlocked: 99 }) });
    assert.deepEqual(readProgress(60), { level: 3, unlocked: 60 });
    useStorage({ "path-connect-progress": "not json" });
    assert.deepEqual(readProgress(60), START);
  });

  it("reads the hidden unlock only from the exact stored string", () => {
    assert.equal(devUnlockAll(), false);
    useStorage({ devUnlockAll: "true" });
    assert.equal(devUnlockAll(), true);
    useStorage({ devUnlockAll: "1" });
    assert.equal(devUnlockAll(), false);
  });

  it("stores the hidden unlock from the secret parameter and drops just that parameter", () => {
    useStorage({ stay: "1" });
    const replaced: string[] = [];
    (globalThis as { window?: unknown }).window = {
      location: new URL("https://play.example/path?dev=unlock-all&stay=1#board"),
      history: {
        state: { keep: true },
        replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
          replaced.push(String(url));
        },
      },
    };
    captureDevUnlock();
    assert.equal(localStorage.getItem("devUnlockAll"), "true");
    assert.deepEqual(replaced, ["/path?stay=1#board"]);

    useStorage();
    (globalThis as { window?: unknown }).window = {
      location: new URL("https://play.example/game?dev=unlock-all"),
      history: { state: null, replaceState: (_s: unknown, _t: string, url?: string | URL | null) => replaced.push(String(url)) },
    };
    captureDevUnlock();
    assert.equal(replaced.at(-1), "/game");

    useStorage();
    replaced.length = 0;
    (globalThis as { window?: unknown }).window = {
      location: new URL("https://play.example/?dev=something-else"),
      history: { state: null, replaceState: () => replaced.push("touched") },
    };
    captureDevUnlock();
    assert.equal(localStorage.getItem("devUnlockAll"), null);
    assert.deepEqual(replaced, []);
  });

  it("keeps a later level in play when every level is open, without raising progress", () => {
    useStorage({ "path-connect-progress": JSON.stringify({ level: 40, unlocked: 14 }) });
    assert.deepEqual(readProgress(60, { openAll: true }), { level: 40, unlocked: 14 });
    useStorage({ "path-connect-progress": JSON.stringify({ level: 99, unlocked: 14 }) });
    assert.deepEqual(readProgress(60, { openAll: true }), { level: 60, unlocked: 14 });
  });
});
