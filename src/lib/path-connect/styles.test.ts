import assert from "node:assert/strict";
import test from "node:test";
import { CHAPTERS, LEVELS } from "./levels.ts";
import { THEMES, lessonCopy, themeById } from "./styles.ts";

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

test("themes run in pairs", () => {
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

test("how-to-play cards talk about water on Plumbing and devices on Fire Safety", () => {
  const plumbing = lessonCopy(themeById("plumbing"));
  assert.equal(plumbing.title1, "Water starts at the water main");
  assert.equal(
    plumbing.body1,
    "Connect the pipes so water reaches every fixture. It flows only through pipe ends that face each other.",
  );
  assert.equal(plumbing.note1, "The water main is the only water source");
  assert.match(
    themeById("plumbing").rule,
    /A fixture fills only when the pipes face each other all the way from the water main\./,
  );
  assert.equal(
    plumbing.body2,
    "Water stops at each fixture. Fixtures don't pass it on, so every fixture needs its own path back to the water main.",
  );
  assert.equal(plumbing.note2, "Fixtures don't pass water on");

  const fire = lessonCopy(themeById("fire"));
  assert.equal(fire.title1, "Power starts at the fire panel");
  assert.equal(
    fire.body1,
    "Connect the pipes so power reaches every device. It flows only through pipe ends that face each other.",
  );
  assert.equal(fire.note1, "The fire panel is the only power source");
  assert.match(
    themeById("fire").rule,
    /A device arms only when the pipes face each other all the way from the fire panel\./,
  );
  assert.equal(
    fire.body2,
    "Power stops at each device. Devices don't pass it on, so every device needs its own path back to the fire panel.",
  );
  assert.equal(fire.note2, "Devices don't pass power on");
});

test("the first-time lesson and the other themes still talk about power", () => {
  const lighting = lessonCopy(themeById("lights"));
  assert.equal(lighting.title1, "Power starts at the house");
  assert.match(lighting.body1, /power reaches every light/);
  assert.equal(lighting.note1, "The house is the only power source");
  assert.match(lighting.body2, /^Power stops at each light\. Lights don't pass it on/);
  assert.equal(lighting.note2, "Lights don't pass power on");
  assert.match(themeById("lights").rule, /^Power starts at the house\./);

  const alarm = lessonCopy(themeById("alarm"));
  assert.equal(alarm.title1, "Power starts at the house");
  assert.match(alarm.body1, /power reaches every speaker/);
  assert.equal(alarm.note2, "Speakers don't pass power on");
  assert.match(themeById("alarm").rule, /A speaker comes on only when/);
});
