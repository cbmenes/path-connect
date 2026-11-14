import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");

test("the native shell wraps the static client and leaves the website build alone", () => {
  const config = readFileSync(join(root, "capacitor.config.ts"), "utf8");
  const vite = readFileSync(join(root, "vite.config.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const progress = readFileSync(join(root, "src/lib/path-connect/progress.ts"), "utf8");

  assert.match(config, /appName:\s*"Path Connect"/);
  assert.match(config, /appId:\s*"com\.cbmenes\.pathconnect"/);
  assert.match(config, /webDir:\s*"dist\/client"/);
  assert.equal(/^\s*url\s*:/m.test(config), false);
  assert.equal(/admob/i.test(JSON.stringify(pkg)), false);
  const gradle = readFileSync(join(root, "android/app/build.gradle"), "utf8");
  const project = readFileSync(join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  assert.match(gradle, /applicationId "com\.cbmenes\.pathconnect"/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.cbmenes\.pathconnect;/);
  assert.equal(/admob/i.test(gradle + project), false);

  assert.match(vite, /CAPACITOR_BUILD/);
  assert.match(vite, /serverDir:\s*"\.\/server"/);
  assert.match(vite, /grokPwaPlugin\(\)/);
  assert.match(pkg.scripts["build:native"], /CAPACITOR_BUILD=1/);
  assert.equal(pkg.scripts.build.includes("CAPACITOR_BUILD"), false);

  assert.match(progress, /export const ALL_LEVELS_OPEN = false/);
  assert.match(progress, /const DEV_UNLOCK_KEY = "devUnlockAll"/);
});
