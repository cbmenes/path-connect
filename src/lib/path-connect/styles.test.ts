import assert from "node:assert/strict";
import test from "node:test";
import { CHAPTERS, LEVELS } from "./levels.ts";
import { THEMES, themeById } from "./styles.ts";

test("Plumbing joins the three systems as a fourth level theme", () => {
  assert.deepEqual(
    THEMES.map((theme) => theme.id),
    ["lights", "alarm", "fire", "plumbing"],
  );
  assert.ok(LEVELS.every((level) => THEMES.some((theme) => theme.id === level.theme)));
});

test("Plumbing speaks about a water main and fixtures", () => {
  const plumbing = themeById("plumbing");
  assert.equal(plumbing.source, "Water main");
  assert.equal(plumbing.node, "fixture");
  assert.equal(plumbing.nodePlural, "fixtures");
  assert.equal(plumbing.conduit, "pipe");
});

test("Plumbing unlocks after School Fire Alarm and owns levels 33–42", () => {
  for (const level of LEVELS.slice(0, 32)) assert.notEqual(level.theme, "plumbing");
  for (const level of LEVELS.slice(32, 42)) assert.equal(level.theme, "plumbing");
  assert.equal(LEVELS[32]!.unlock, "Plumbing");
  assert.match(LEVELS[32]!.blurb, /fixtures/);
  const late = new Set(LEVELS.slice(42).map((level) => level.theme));
  assert.deepEqual([...late].sort(), ["alarm", "fire", "lights", "plumbing"]);
  assert.equal(CHAPTERS.find((chapter) => chapter.from === 33)?.to, 46);
});

test("every level has its own name", () => {
  const names = LEVELS.map((level) => level.name);
  assert.equal(new Set(names).size, names.length);
});
