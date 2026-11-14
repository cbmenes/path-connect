import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { nativeSafeAreaScript } from "./native-safe-area.mjs";

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

  const scene = readFileSync(join(root, "ios/App/App/SceneDelegate.swift"), "utf8");
  assert.match(scene, /rootViewController = PathConnectViewController\(\)/);
  assert.match(scene, /--pc-native-top/);
  assert.match(scene, /MutationObserver/);
  assert.match(nativeSafeAreaScript("59px"), /^!function\(\)\{var t="59px"/);

  // The launch artwork: the plugin, the launch screen, and the controller's overlay all use the "Splash" asset.
  assert.ok(pkg.dependencies["@capacitor/splash-screen"]);
  assert.match(config, /SplashScreen:\s*\{[^}]*launchShowDuration:\s*1200/);
  assert.match(scene, /splashHold: TimeInterval = 1\.2/);
  assert.match(scene, /UIImage\(named: "Splash"\)/);
  const launch = readFileSync(join(root, "ios/App/App/Base.lproj/LaunchScreen.storyboard"), "utf8");
  assert.match(launch, /image="Splash"/);
  const splashSet = JSON.parse(
    readFileSync(join(root, "ios/App/App/Assets.xcassets/Splash.imageset/Contents.json"), "utf8"),
  );
  for (const { filename } of splashSet.images) {
    assert.ok(
      existsSync(join(root, "ios/App/App/Assets.xcassets/Splash.imageset", filename)),
      filename,
    );
  }
  const cream = /backgroundColor: "#fbedd0"/;
  assert.match(config, cream);
  assert.match(scene, /UIColor\(red: 0\.984, green: 0\.929, blue: 0\.816/);
  assert.match(launch, /red="0\.984" green="0\.929" blue="0\.816"/);
  const spm = readFileSync(join(root, "ios/App/CapApp-SPM/Package.swift"), "utf8");
  assert.match(spm, /CapacitorSplashScreen/);
  const rootView = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");
  assert.equal(rootView.includes("viewport-fit=cover"), false);

  assert.match(progress, /export const ALL_LEVELS_OPEN = false/);
  assert.match(progress, /const DEV_UNLOCK_KEY = "devUnlockAll"/);
});
