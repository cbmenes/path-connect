import assert from "node:assert/strict";
import test from "node:test";
import { LEVELS } from "./levels.ts";
import { PLUMBING, THEMES, lookById, plumbingBlurb, plumbingRoom, themeById } from "./styles.ts";

test("the three level themes are unchanged and still drive every level", () => {
  assert.deepEqual(
    THEMES.map((theme) => theme.id),
    ["lights", "alarm", "fire"],
  );
  assert.ok(LEVELS.every((level) => THEMES.some((theme) => theme.id === level.theme)));
});

test("lookById returns Plumbing only for the plumbing look", () => {
  assert.equal(lookById("plumbing"), PLUMBING);
  for (const theme of THEMES) assert.equal(lookById(theme.id as "lights" | "alarm" | "fire"), themeById(theme.id as "lights"));
});

test("Plumbing speaks about a water main and fixtures", () => {
  assert.equal(PLUMBING.source, "Water main");
  assert.equal(PLUMBING.node, "fixture");
  assert.equal(PLUMBING.nodePlural, "fixtures");
  assert.equal(PLUMBING.conduit, "pipe");
});

test("every level gets a room name, and the blurb counts fixtures", () => {
  for (const level of LEVELS) assert.ok(plumbingRoom(level.id).length > 0);
  assert.equal(plumbingRoom(1), plumbingRoom(13));
  assert.equal(plumbingBlurb(1), "One fixture to fill from the main.");
  assert.equal(plumbingBlurb(4), "4 fixtures to fill from the main.");
});
