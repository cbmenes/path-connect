// Renders the native iOS app icon and launch splash for the Capacitor shell.
// Output goes only into ios/App/App/Assets.xcassets; the website and PWA icons are untouched.
// Usage: node scripts/generate-ios-assets.mjs  (then strips alpha with Pillow, which App Store icons require)
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import playwright from "playwright";

const root = join(import.meta.dirname, "..");
const assets = join(root, "ios/App/App/Assets.xcassets");

const COPPER = "#c17a3a";
const COPPER_DARK = "#8a4f24";
const COPPER_LIGHT = "#f3d0a2";
const ROOF = "#a5402f";
const ROOF_DARK = "#5c2a22";
const ROOF_LIGHT = "#dd8a74";
const IVORY = "#f6ecd6";
const IVORY_EDGE = "#bca580";
const BRONZE = "#b07a3e";
const BRONZE_DARK = "#7a4f24";
const BRONZE_LIGHT = "#e8bf86";
// The Public Announcement board: tray #7a9d97 and tiles #9dbcb6.
const TEAL_TRAY_LIGHT = "#8aaba5";
const TEAL_TRAY = "#7a9d97";
const TEAL_TRAY_DARK = "#6d8f89";
const TEAL_TILE = "#9dbcb6";
const TEAL_SHADE = "#34504c";

const background = (size) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9efe4"/>
      <stop offset="1" stop-color="#a9d3c2"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6">
      <stop offset="0" stop-color="#fffaf0" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#fffaf0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>`;

function pipe(d) {
  return `
    <path d="${d}" fill="none" stroke="${COPPER_DARK}" stroke-width="96" stroke-linecap="butt" stroke-linejoin="round" opacity="0.35" transform="translate(6 12)"/>
    <path d="${d}" fill="none" stroke="${COPPER}" stroke-width="84" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${COPPER_LIGHT}" stroke-width="18" stroke-linejoin="round" opacity="0.85" transform="translate(-14 -14)"/>`;
}

function collar(x, y, vertical) {
  const w = vertical ? 112 : 34;
  const h = vertical ? 34 : 112;
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="12" fill="${COPPER}" stroke="${COPPER_DARK}" stroke-width="6"/>`;
}

/**
 * The Public Announcement house (bronze speaker grille in the gable, bronze
 * door) with a red roof so it reads against teal. Drawn in its 64×60 box.
 */
const paHouse = `
  <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill="#fbf4e4"/>
  <path d="M14.5 30.5 32 17" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke="${IVORY_EDGE}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>
  <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="${ROOF_DARK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="${ROOF}" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.6 28.6 32 10.1" fill="none" stroke="${ROOF_LIGHT}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
  <circle cx="32" cy="26.5" r="4.4" fill="${BRONZE_DARK}"/>
  <circle cx="32" cy="26.5" r="3.3" fill="${BRONZE}"/>
  <path d="M29.8 25.4h4.4M29.4 27h5.2M29.8 28.6h4.4" stroke="${BRONZE_DARK}" stroke-width="0.7" stroke-linecap="round"/>
  <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill="${BRONZE}"/>
  <path d="M19.2 43.4a3.8 3.8 0 0 1 3.8-3.6" fill="none" stroke="${BRONZE_LIGHT}" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="25.6" cy="48.6" r="1.2" fill="${BRONZE_LIGHT}"/>
  <rect x="35" y="35.5" width="12.5" height="11.5" rx="2.6" fill="#f3e6cf" stroke="${IVORY_EDGE}" stroke-width="1.2"/>
  <path d="M41.25 36.5v9.5M36 41.25h10.5" stroke="${IVORY_EDGE}" stroke-width="1.6"/>`;

/** A raised teal board tile, like the ones on the game board. */
function tealTile(x, y, size, radius) {
  return `
  <rect x="${x + 8}" y="${y + 22}" width="${size}" height="${size}" rx="${radius}" fill="${TEAL_SHADE}" opacity="0.3"/>
  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="url(#tile-face)"/>
  <rect x="${x + 14}" y="${y + 14}" width="${size - 28}" height="${size - 28}" rx="${radius - 14}" fill="none" stroke="white" stroke-width="10" opacity="0.35"/>
  <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="none" stroke="${TEAL_SHADE}" stroke-width="6" opacity="0.25"/>`;
}

const tileDefs = `
  <defs>
    <linearGradient id="tile-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b3cfc9"/>
      <stop offset="1" stop-color="${TEAL_TILE}"/>
    </linearGradient>
    <linearGradient id="tray" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${TEAL_TRAY_LIGHT}"/>
      <stop offset="0.55" stop-color="${TEAL_TRAY}"/>
      <stop offset="1" stop-color="${TEAL_TRAY_DARK}"/>
    </linearGradient>
  </defs>`;

// Icon: one big teal tile on the board tray with the house in the middle. No pipes, so it stays clear when small.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${tileDefs}
  <rect width="1024" height="1024" fill="url(#tray)"/>
  ${tealTile(132, 132, 760, 170)}
  <g transform="translate(224 240) scale(9)">${paHouse}</g>
</svg>`;

/** Splash art: the same teal tile and house, now on a copper run, drawn in a 1024 box. */
const art = `
  ${tealTile(172, 172, 680, 150)}
  <clipPath id="tile"><rect x="172" y="172" width="680" height="680" rx="150"/></clipPath>
  <g clip-path="url(#tile)">
    ${pipe("M150 540 H360")}
    ${pipe("M560 540 H610 A100 100 0 0 1 710 640 V880")}
  </g>
  ${collar(208, 540, false)}
  ${collar(710, 816, true)}
  <g transform="translate(278 262) scale(7)">${paHouse}</g>`;

// The launch image fills the screen (aspect fill), so the art stays in the middle third,
// inside what a portrait iPhone shows of the 2732 square.
const SPLASH = 2732;
const scale = 1.05;
const offset = SPLASH / 2 - 512 * scale;
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH}" height="${SPLASH}" viewBox="0 0 ${SPLASH} ${SPLASH}">${background(SPLASH)}${tileDefs}<g transform="translate(${offset} ${offset}) scale(${scale})">${art}</g></svg>`;

const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/opt/google/chrome/chrome",
  args: ["--no-sandbox"],
});
async function render(svg, size, files) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const png = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: size, height: size },
  });
  await page.close();
  return { png, files };
}
const jobs = [
  await render(iconSvg, 1024, [join(assets, "AppIcon.appiconset/AppIcon-512@2x.png")]),
  await render(splashSvg, SPLASH, [
    join(assets, "Splash.imageset/splash-2732x2732.png"),
    join(assets, "Splash.imageset/splash-2732x2732-1.png"),
    join(assets, "Splash.imageset/splash-2732x2732-2.png"),
  ]),
];
await browser.close();

mkdirSync("/tmp/pc-ios-assets", { recursive: true });
for (const [i, { png, files }] of jobs.entries()) {
  const tmp = `/tmp/pc-ios-assets/${i}.png`;
  const { writeFileSync } = await import("node:fs");
  writeFileSync(tmp, png);
  execFileSync("python3", [
    "-c",
    "import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert('RGB'); [im.save(p, optimize=True) for p in sys.argv[2:]]",
    tmp,
    ...files,
  ]);
  console.log(files.map((f) => f.replace(`${root}/`, "")).join("\n"));
}
