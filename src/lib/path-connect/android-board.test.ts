import assert from "node:assert/strict";
import test from "node:test";
import { isAndroidShell, planAndroidBoard, planFixed } from "./android-board.ts";

test("only the Android shell opts in", () => {
  const host = (platform?: string) =>
    ({
      Capacitor: platform ? { getPlatform: () => platform } : undefined,
      innerWidth: 400,
      innerHeight: 800,
      document: { documentElement: { style: { setProperty() {} } } },
    }) as unknown as Parameters<typeof isAndroidShell>[0];
  assert.equal(isAndroidShell(host()), false);
  assert.equal(isAndroidShell(host("web")), false);
  assert.equal(isAndroidShell(host("ios")), false);
  assert.equal(isAndroidShell(host("android")), true);
});

test("a phone 7×7 matches the cozy width and stays square", () => {
  const plan = planAndroidBoard(412, 842, 7, 7);
  assert.ok(plan);
  assert.equal(plan.wrap, 388);
  assert.equal(plan.pad, 11);
  assert.equal(plan.gap, 6);
  assert.equal(plan.inner, 366);
  assert.ok(Math.abs(plan.tile - 47.142857) < 1e-6);
  assert.equal(plan.boardHeight, 7 * plan.tile + 6 * plan.gap);
});

test("a phone 5×5 uses the wider gap and the 40px gutter", () => {
  const plan = planAndroidBoard(390, 844, 5, 5);
  assert.ok(plan);
  assert.equal(plan.wrap, 350);
  assert.equal(plan.pad, 14);
  assert.equal(plan.gap, 8);
  assert.equal(plan.inner, 322);
  assert.equal(plan.tile, (322 - 8 * 4) / 5);
});

test("a wide 7×9 uses the shorter cap so tiles do not shrink", () => {
  const plan = planAndroidBoard(1200, 800, 7, 9);
  assert.ok(plan);
  assert.equal(plan.wrap, 430);
  assert.equal(plan.pad, 11);
  assert.equal(plan.gap, 6);
});

test("a wide 6×6 stops at the 500px cap", () => {
  const plan = planAndroidBoard(1280, 900, 6, 6);
  assert.ok(plan);
  assert.equal(plan.wrap, 500);
  assert.equal(plan.gap, 7);
  assert.equal(plan.pad, 14);
});

test("a zero viewport does not invent a grid", () => {
  assert.equal(planAndroidBoard(0, 800, 7, 7), null);
  assert.equal(planFixed(20, 7, 7, 14, 6), null);
});
