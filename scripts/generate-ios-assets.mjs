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
const ROOF_LIGHT = "#dd8a74";
const IVORY = "#f6ecd6";
const IVORY_EDGE = "#bca580";

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

/** The tile, copper run, and house, drawn in a 1024 box. */
const art = `
  <rect x="180" y="196" width="680" height="680" rx="150" fill="#6e7f5c" opacity="0.28"/>
  <rect x="172" y="172" width="680" height="680" rx="150" fill="${IVORY}"/>
  <rect x="190" y="190" width="644" height="644" rx="134" fill="none" stroke="white" stroke-width="10" opacity="0.7"/>
  <rect x="172" y="172" width="680" height="680" rx="150" fill="none" stroke="${IVORY_EDGE}" stroke-width="6" opacity="0.6"/>
  <clipPath id="tile"><rect x="172" y="172" width="680" height="680" rx="150"/></clipPath>
  <g clip-path="url(#tile)">
    ${pipe("M150 540 H360")}
    ${pipe("M560 540 H610 A100 100 0 0 1 710 640 V880")}
  </g>
  ${collar(208, 540, false)}
  ${collar(710, 816, true)}
  <g transform="translate(278 262) scale(7)">
    <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill="#fbf4e4"/>
    <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke="${IVORY_EDGE}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>
    <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="#5c2a22" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
    <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="${ROOF}" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.6 28.6 32 10.1" fill="none" stroke="${ROOF_LIGHT}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
    <circle cx="32" cy="26.5" r="4.4" fill="#7e2f22"/>
    <circle cx="32" cy="26.5" r="3.3" fill="#ffb020"/>
    <circle cx="31" cy="25.5" r="1.1" fill="#fff1c9"/>
    <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill="${ROOF}"/>
    <circle cx="25.6" cy="48.6" r="1.2" fill="#f0cf86"/>
    <rect x="35" y="35.5" width="12.5" height="11.5" rx="2.6" fill="#f3e6cf" stroke="${IVORY_EDGE}" stroke-width="1.2"/>
    <path d="M41.25 36.5v9.5M36 41.25h10.5" stroke="${IVORY_EDGE}" stroke-width="1.6"/>
  </g>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background(1024)}${art}</svg>`;

// The launch image fills the screen (aspect fill), so the art stays in the middle third,
// inside what a portrait iPhone shows of the 2732 square.
const SPLASH = 2732;
const scale = 1.05;
const offset = SPLASH / 2 - 512 * scale;
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH}" height="${SPLASH}" viewBox="0 0 ${SPLASH} ${SPLASH}">${background(SPLASH)}<g transform="translate(${offset} ${offset}) scale(${scale})">${art}</g></svg>`;

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
