// Loads the native client with the iOS shell's safe-area script and a 59pt
// Dynamic Island inset, then checks that Daily and the menu clear it and open.
// Usage: node scripts/ios-safe-area-check.mjs <url> [screenshot]
import playwright from "playwright";
import { nativeSafeAreaScript } from "./native-safe-area.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:8095/";
const shot = process.argv[3];
const INSET = 59;

const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/opt/google/chrome/chrome",
  args: ["--no-sandbox"],
});
const errors = [];
async function measure(native) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("path-connect-onboarded", "1");
    localStorage.setItem("path-connect-source-tip", "1");
  });
  if (native) await page.addInitScript(nativeSafeAreaScript(`${INSET}px`));
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(
    () =>
      Object.keys(document.querySelector(".pc-tile") ?? {}).some((k) => k.startsWith("__react")),
    null,
    { timeout: 60000 },
  );
  if (native) {
    await page.evaluate(() => {
      document.documentElement.removeAttribute("data-native");
      document.documentElement.removeAttribute("style");
    });
    await page.waitForTimeout(50);
  }
  const box = async (locator) => (await locator.boundingBox()) ?? { y: -1, height: 0 };
  const daily = page.getByRole("button", { name: "Daily" });
  const menu = page.getByRole("button", { name: "Game menu" });
  const topBar = await box(page.locator(".pc-top"));
  const dailyBox = await box(daily);
  const menuBox = await box(menu);
  await daily.tap();
  await menu.tap();
  const state = await page.evaluate(() => ({
    native: document.documentElement.getAttribute("data-native"),
    mode: document.querySelector(".pc-shell")?.getAttribute("data-mode"),
    menuOpen: document.querySelector(".pc-menu-button")?.getAttribute("aria-expanded") === "true",
    paddingTop: getComputedStyle(document.querySelector(".pc-shell")).paddingTop,
  }));
  if (shot && native) await page.screenshot({ path: shot });
  await page.close();
  return { topBarY: topBar.y, dailyY: dailyBox.y, menuY: menuBox.y, ...state };
}

const web = await measure(false);
const ios = await measure(true);
await browser.close();
const result = {
  web,
  ios,
  clearsInset: ios.topBarY >= INSET && ios.dailyY >= INSET && ios.menuY >= INSET,
  webUnchanged: web.paddingTop === "10px" && web.native === null,
  errors,
};
console.log(JSON.stringify(result, null, 2));
const ok =
  result.clearsInset &&
  result.webUnchanged &&
  ios.mode === "daily" &&
  ios.menuOpen &&
  ios.native === "ios" &&
  errors.length === 0;
process.exit(ok ? 0 : 1);
