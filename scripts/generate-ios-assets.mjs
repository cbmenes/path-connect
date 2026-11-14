// Renders the native iOS app icon for the Capacitor shell: the Public
// Announcement house, exactly as the game draws it, on a teal board tile with
// one copper pipe. Output goes only into ios/App/App/Assets.xcassets; the
// website and PWA icons are untouched. The launch splash is built separately
// by scripts/build-ios-splash.py.
// Usage: node scripts/generate-ios-assets.mjs  (strips alpha with Pillow, which App Store icons require)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import playwright from "playwright";

const root = join(import.meta.dirname, "..");
const iconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

// From PaHouseSource in src/components/path-connect/path-connect-game.tsx.
const IVORY = "#fbf6ec";
const IVORY_EDGE = "#c9b99e";
const BRONZE = "#b07a3e";
const BRONZE_DARK = "#7a4f24";
const BRONZE_LIGHT = "#e8bf86";
// The Public Announcement board: tray #7a9d97 and tiles #9dbcb6.
const TEAL_TRAY_LIGHT = "#8aaba5";
const TEAL_TRAY = "#7a9d97";
const TEAL_TRAY_DARK = "#6d8f89";
const TEAL_TILE = "#9dbcb6";
const TEAL_SHADE = "#34504c";
const COPPER = "#c4793f";
const COPPER_DARK = "#8a4f24";
const COPPER_LIGHT = "#f8cfa2";

/** PaHouseSource, unchanged, in its 64×60 box. */
const paHouse = `
  <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill="${IVORY}"/>
  <path d="M14.5 30.5 32 17" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke="${IVORY_EDGE}" stroke-width="2.4" stroke-linecap="round" opacity="0.5"/>
  <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="#233f3c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="#3f6f6a" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.6 28.6 32 10.1" fill="none" stroke="#8fb8b1" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
  <circle cx="32" cy="26.5" r="4.4" fill="${BRONZE_DARK}"/>
  <circle cx="32" cy="26.5" r="3.3" fill="${BRONZE}"/>
  <path d="M29.8 25.4h4.4M29.4 27h5.2M29.8 28.6h4.4" stroke="${BRONZE_DARK}" stroke-width="0.7" stroke-linecap="round"/>
  <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill="${BRONZE}"/>
  <path d="M19.2 43.4a3.8 3.8 0 0 1 3.8-3.6" fill="none" stroke="${BRONZE_LIGHT}" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="25.6" cy="48.6" r="1.2" fill="${BRONZE_LIGHT}"/>
  <rect x="35" y="35.5" width="12.5" height="11.5" rx="2.6" fill="#f3e6cf" stroke="${IVORY_EDGE}" stroke-width="1.2"/>
  <path d="M41.25 36.5v9.5M36 41.25h10.5" stroke="${IVORY_EDGE}" stroke-width="1.6"/>`;

/** One copper run from the house's right wall out through the tile edge, with a collar at the edge. */
const pipeRun = `
  <path d="M680 644 H900" stroke="${COPPER_DARK}" stroke-width="104" opacity="0.35" transform="translate(4 12)"/>
  <path d="M680 644 H900" stroke="${COPPER}" stroke-width="92"/>
  <path d="M680 628 H900" stroke="${COPPER_LIGHT}" stroke-width="18" opacity="0.85"/>
  <rect x="800" y="584" width="40" height="120" rx="12" fill="${COPPER}" stroke="${COPPER_DARK}" stroke-width="7"/>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="tray" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${TEAL_TRAY_LIGHT}"/>
      <stop offset="0.55" stop-color="${TEAL_TRAY}"/>
      <stop offset="1" stop-color="${TEAL_TRAY_DARK}"/>
    </linearGradient>
    <linearGradient id="tile-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b3cfc9"/>
      <stop offset="1" stop-color="${TEAL_TILE}"/>
    </linearGradient>
    <clipPath id="tile"><rect x="132" y="132" width="760" height="760" rx="170"/></clipPath>
  </defs>
  <rect width="1024" height="1024" fill="url(#tray)"/>
  <rect x="140" y="154" width="760" height="760" rx="170" fill="${TEAL_SHADE}" opacity="0.3"/>
  <rect x="132" y="132" width="760" height="760" rx="170" fill="url(#tile-face)"/>
  <g clip-path="url(#tile)">${pipeRun}</g>
  <rect x="146" y="146" width="732" height="732" rx="156" fill="none" stroke="white" stroke-width="10" opacity="0.35"/>
  <rect x="132" y="132" width="760" height="760" rx="170" fill="none" stroke="${TEAL_SHADE}" stroke-width="6" opacity="0.25"/>
  <g transform="translate(224 233) scale(9)">${paHouse}</g>
</svg>`;

const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/opt/google/chrome/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.setContent(`<html><body style="margin:0">${iconSvg}</body></html>`);
const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1024, height: 1024 } });
await browser.close();

mkdirSync("/tmp/pc-ios-assets", { recursive: true });
const tmp = "/tmp/pc-ios-assets/icon.png";
writeFileSync(tmp, png);
execFileSync("python3", [
  "-c",
  "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], optimize=True)",
  tmp,
  iconPath,
]);
console.log(iconPath.replace(`${root}/`, ""));
