import assert from "node:assert/strict";
import test from "node:test";
import { markOnboarded, needsOnboarding } from "./onboarding.ts";

function memory(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

test("a brand-new player sees the lesson", () => {
  assert.equal(needsOnboarding(memory()), true);
});

test("the lesson shows only once", () => {
  const storage = memory();
  markOnboarded(storage);
  assert.equal(needsOnboarding(storage), false);
});

test("players with saved progress are not interrupted", () => {
  assert.equal(needsOnboarding(memory({ "path-connect-progress": '{"level":4,"unlocked":4}' })), false);
});

test("no storage means no lesson", () => {
  assert.equal(needsOnboarding(null), false);
});

test("storage that throws is treated as no lesson", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(needsOnboarding(broken), false);
  assert.doesNotThrow(() => markOnboarded(broken));
});
