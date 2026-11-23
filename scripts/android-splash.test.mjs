import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");

function imageInfo(path) {
  const raw = execFileSync(
    "python3",
    [
      "-c",
      "import json,sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGB'); print(json.dumps({'w':im.width,'h':im.height,'top':im.getpixel((0,0)),'mid':im.getpixel((im.width//2, im.height//2))}))",
      path,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(raw);
}

test("Android launch splash uses the full Path Connect artwork", () => {
  const source = imageInfo(join(root, "assets/splash.png"));
  assert.ok(source.w >= 700 && source.h > source.w, "source splash should be the portrait illustration");

  const portrait = imageInfo(join(root, "android/app/src/main/res/drawable-port-xxhdpi/splash.webp"));
  assert.equal(portrait.w, 960);
  assert.equal(portrait.h, 1600);
  const [red, green, blue] = portrait.top;
  // Cream from the illustration, not the white Capacitor logo background.
  assert.ok(red > 230 && red < 255 && green > 210 && blue > 180 && blue < 240, portrait.top.join(","));
  const [midRed, midGreen] = portrait.mid;
  assert.ok(Math.abs(midRed - red) + Math.abs(midGreen - green) > 40, "center should be the illustration, not empty cream");

  const styles = readFileSync(join(root, "android/app/src/main/res/values/styles.xml"), "utf8");
  const v31 = readFileSync(join(root, "android/app/src/main/res/values-v31/styles.xml"), "utf8");
  const blank = readFileSync(join(root, "android/app/src/main/res/drawable/splash_blank.xml"), "utf8");
  assert.match(blank, /@android:color\/transparent/);
  assert.match(v31, /windowSplashScreenBackground">@color\/splash_background/);
  assert.match(v31, /windowSplashScreenAnimatedIcon">@drawable\/splash_blank/);
  assert.match(v31, /postSplashScreenTheme">@style\/AppTheme\.NoActionBar/);
  assert.match(v31, /android:background">@drawable\/splash</);
  assert.match(v31, /android:windowBackground">@drawable\/splash</);
  assert.equal(v31.includes("splash_icon"), false);
  assert.equal(v31.includes("ic_launcher"), false);
  assert.equal(styles.includes("ic_launcher"), false);

  const activity = readFileSync(
    join(root, "android/app/src/main/java/com/cbmenes/pathconnect/MainActivity.java"),
    "utf8",
  );
  assert.match(activity, /R\.drawable\.splash/);
  assert.match(activity, /FIT_CENTER/);
  assert.match(activity, /setOnExitAnimationListener\(view -> view.remove\(\)\)/);

  const config = readFileSync(join(root, "capacitor.config.ts"), "utf8");
  assert.match(config, /launchShowDuration:\s*1200/);
  assert.match(config, /launchAutoHide:\s*true/);
  assert.match(config, /launchFadeOutDuration:\s*300/);
  assert.match(config, /backgroundColor:\s*"#fbedd0"/);
  assert.match(config, /showSpinner:\s*false/);

  const manifest = readFileSync(join(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:theme="@style\/AppTheme\.NoActionBarLaunch"/);
});

test("the splash generator reads assets/splash.png and does not touch iOS", () => {
  const script = readFileSync(join(root, "scripts/build-android-splash.py"), "utf8");
  assert.match(script, /assets\/splash\.png/);
  assert.equal(script.includes("ios/"), false);
  execFileSync("python3", ["scripts/build-android-splash.py"], { cwd: root, stdio: "inherit" });
});
