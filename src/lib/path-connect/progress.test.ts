import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { START, readProgress, writeProgress } from "./progress.ts";

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

  it("keeps a later level in play when every level is open, without raising progress", () => {
    useStorage({ "path-connect-progress": JSON.stringify({ level: 40, unlocked: 14 }) });
    assert.deepEqual(readProgress(60, { openAll: true }), { level: 40, unlocked: 14 });
    useStorage({ "path-connect-progress": JSON.stringify({ level: 99, unlocked: 14 }) });
    assert.deepEqual(readProgress(60, { openAll: true }), { level: 60, unlocked: 14 });
  });
});
