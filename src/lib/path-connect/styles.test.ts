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

test("Plumbing is its own category, first opening at level 3", () => {
  for (const level of LEVELS.slice(0, 2)) assert.notEqual(level.theme, "plumbing");
  for (const level of LEVELS.slice(2, 4)) assert.equal(level.theme, "plumbing");
  assert.equal(LEVELS[2]!.unlock, "Plumbing");
  assert.match(LEVELS[2]!.blurb, /fixtures/);
  const plumbing = CHAPTERS.find((chapter) => chapter.theme === "plumbing");
  assert.equal(plumbing?.title, "Plumbing");
  assert.deepEqual(plumbing?.ids.slice(0, 8), [3, 4, 11, 12, 19, 20, 27, 28]);
});

test("categories use the broader Lighting and Fire Safety names", () => {
  assert.deepEqual(
    THEMES.map((theme) => theme.title),
    ["Lighting", "Public Announcement", "Fire Safety", "Plumbing"],
  );
});

test("themes run in pairs, then one of each at the end", () => {
  let run = 1;
  for (let i = 1; i < LEVELS.length; i++) {
    run = LEVELS[i]!.theme === LEVELS[i - 1]!.theme ? run + 1 : 1;
    assert.ok(run <= 2, `level ${LEVELS[i]!.id} runs ${run}`);
  }
});

test("levels speak in the words of their own theme", () => {
  for (const level of LEVELS.slice(4, 12)) {
    if (level.theme === "lights") continue;
    assert.doesNotMatch(level.blurb, /\blights?\b|breaker/i, `level ${level.id}`);
  }
});

test("every level has its own name", () => {
  const names = LEVELS.map((level) => level.name);
  assert.equal(new Set(names).size, names.length);
});

test("the first level and Lighting tip name the house as the power source", () => {
  const lighting = themeById("lights");
  assert.equal(lighting.source, "House");
  assert.match(lighting.rule, /^Power starts at the house\./);
  assert.match(LEVELS[0]!.blurb, /^Power starts at the house\./);
});
