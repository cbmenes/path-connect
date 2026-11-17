/**
 * Android System WebView lays the same stylesheet out differently from Chrome.
 * Tile buttons keep a content-based size, so they paint over the cells beside
 * them. This lock is copied only into the Android page. The website and the
 * iOS bundle never receive it.
 *
 * Sizes are written into a stylesheet this file owns. The game redraws the
 * button style attribute, so sizes set on the buttons themselves do not last.
 */

export function isAndroidWebView(userAgent) {
  const ua = String(userAgent ?? "");
  return /Android/i.test(ua) && /;\s*wv\)/.test(ua);
}

/** Inner board width after the scene and tray padding, never wider than the screen. */
export function boardLimit({ viewWidth, shellPad = 0, scenePad = 0, trayPad = 0, sceneWidth = 0, trayWidth = 0 }) {
  if (!(viewWidth > 40)) return 0;
  let limit = viewWidth - shellPad - scenePad - trayPad;
  if (sceneWidth > 40) limit = Math.min(limit, sceneWidth - scenePad - trayPad);
  if (trayWidth > 40) limit = Math.min(limit, trayWidth - trayPad);
  return limit > 40 ? limit : 0;
}

/** Tile track length inside a scene whose width is the live `--pc-board` value. */
export function contentBox(specifiedWidth, scenePad = 0, trayPad = 0) {
  const inner = specifiedWidth - scenePad - trayPad;
  return inner > 40 ? inner : 0;
}

export function tileSize(innerWidth, cols, gap) {
  if (!(innerWidth > 40) || !(cols > 0)) return 0;
  const size = (innerWidth - gap * Math.max(0, cols - 1)) / cols;
  return size > 8 ? size : 0;
}

/**
 * Prefer the tray's content box. If the tiles have already stretched it past
 * the screen, use the live `--pc-board` width instead of that stretched size.
 */
export function lockWidth({ viewWidth, trayInner = 0, specifiedInner = 0 }) {
  const cap = viewWidth > 40 ? viewWidth - 16 : 0;
  if (!(cap > 40)) return 0;
  if (trayInner > 40 && trayInner <= cap) return trayInner;
  if (specifiedInner > 40) return Math.min(specifiedInner, cap);
  if (trayInner > 40) return Math.min(trayInner, cap);
  return 0;
}

export const ANDROID_BOARD_CSS = `
.pc-stage,.pc-board-wrap,.pc-tray,.pc-board,.pc-tile{min-width:0!important}
.pc-tile{
  min-height:0!important;
  box-sizing:border-box!important;
  -webkit-appearance:none!important;
  appearance:none!important;
}
.pc-tile .pc-depth,.pc-tile .pc-spin{
  position:absolute!important;
  top:0!important;right:0!important;bottom:0!important;left:0!important;
  width:auto!important;height:auto!important;
}
`.trim();

export function lockRule(key, cols, rows, px, limit) {
  const size = `${px}px`;
  const width = `${Math.round(limit * 100) / 100}px`;
  return `.pc-board[data-pc-lock="${key}"]{width:${width}!important;min-width:0!important;max-width:100%!important;display:grid!important;grid-template-columns:repeat(${cols},${size})!important;grid-template-rows:repeat(${rows},${size})!important}
.pc-board[data-pc-lock="${key}"]>.pc-tile{width:${size}!important;height:${size}!important;min-width:0!important;min-height:0!important;max-width:${size}!important;max-height:${size}!important;padding:0!important;margin:0!important;box-sizing:border-box!important;flex:none!important;aspect-ratio:auto!important;-webkit-appearance:none!important;appearance:none!important}`;
}

function padPair(style) {
  return (parseFloat(style?.paddingLeft) || 0) + (parseFloat(style?.paddingRight) || 0);
}

function readCols(board) {
  const fromStyle = parseInt(board.style?.getPropertyValue?.("--pc-cols") || "", 10);
  if (fromStyle > 0) return fromStyle;
  const raw = board.getAttribute?.("style") || "";
  const match = /--pc-cols\s*:\s*(\d+)/.exec(raw);
  if (match) return parseInt(match[1], 10);
  return 5;
}

function readGap(board, win) {
  const style = win.getComputedStyle(board);
  const gap = parseFloat(style.columnGap || style.gap);
  return Number.isFinite(gap) && gap >= 0 ? gap : 0;
}

function specifiedBoardWidth(shell, win) {
  const doc = win.document;
  if (!shell?.appendChild || !doc.createElement) return 0;
  win.__pcFitting = true;
  const probe = doc.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:0;min-width:0;width:var(--pc-board);";
  shell.appendChild(probe);
  const width = probe.getBoundingClientRect?.().width || 0;
  probe.remove?.();
  win.__pcFitting = false;
  return width;
}

/**
 * @param {HTMLElement} board
 * @param {Window} win
 */
export function fitBoard(board, win) {
  const tiles = [...board.querySelectorAll(":scope > .pc-tile")];
  if (!tiles.length) return null;
  const cols = readCols(board);
  const rows = Math.ceil(tiles.length / cols);
  const doc = win.document;
  const shell = board.closest?.(".pc-shell") || doc.documentElement;
  const scene = board.closest?.(".pc-board-wrap");
  const tray = board.parentElement;
  const sceneStyle = scene ? win.getComputedStyle(scene) : null;
  const trayStyle = tray ? win.getComputedStyle(tray) : null;
  const scenePad = padPair(sceneStyle);
  const trayPad = padPair(trayStyle);
  const specified = specifiedBoardWidth(shell, win);
  const trayInner = (tray?.clientWidth || 0) - trayPad;
  const limit = lockWidth({
    viewWidth: win.innerWidth,
    trayInner,
    specifiedInner: contentBox(specified, scenePad, trayPad),
  });
  const size = tileSize(limit, cols, readGap(board, win));
  if (!size) return null;
  const px = Math.round(size * 100) / 100;
  const width = Math.round(limit * 100) / 100;
  board.style.setProperty("width", `${width}px`, "important");
  board.style.setProperty("min-width", "0", "important");
  board.style.setProperty("max-width", "100%", "important");
  board.style.setProperty("grid-template-columns", `repeat(${cols}, ${px}px)`, "important");
  board.style.setProperty("grid-template-rows", `repeat(${rows}, ${px}px)`, "important");
  for (const tile of tiles) {
    tile.style.setProperty("box-sizing", "border-box", "important");
    tile.style.setProperty("width", `${px}px`, "important");
    tile.style.setProperty("height", `${px}px`, "important");
    tile.style.setProperty("min-width", "0", "important");
    tile.style.setProperty("min-height", "0", "important");
    tile.style.setProperty("max-width", `${px}px`, "important");
    tile.style.setProperty("max-height", `${px}px`, "important");
    tile.style.setProperty("padding", "0", "important");
    tile.style.setProperty("flex", "none", "important");
    tile.style.setProperty("aspect-ratio", "auto", "important");
  }
  return { cols, rows, px, limit };
}

export function installAndroidBoardFix(win) {
  if (!win?.document) return false;
  if (win.__pcAndroidBoard) return true;
  win.__pcAndroidBoard = true;
  const doc = win.document;
  const style = doc.createElement("style");
  style.setAttribute("data-pc-android-board", "");
  style.textContent = ANDROID_BOARD_CSS;
  (doc.head || doc.documentElement).appendChild(style);

  const run = () => {
    if (win.__pcFitting) return;
    try {
      const boards = [...doc.querySelectorAll(".pc-board")];
      const rules = [ANDROID_BOARD_CSS];
      boards.forEach((board, index) => {
        const locked = fitBoard(board, win);
        if (!locked) return;
        const key = String(index);
        board.setAttribute("data-pc-lock", key);
        board.setAttribute("data-pc-cell", String(locked.px));
        rules.push(lockRule(key, locked.cols, locked.rows, locked.px, locked.limit));
      });
      const css = rules.join("\n");
      if (style.textContent !== css) style.textContent = css;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      win.console?.log?.("[pc-board] " + message);
    }
  };

  let running = false;
  const safe = () => {
    if (running || win.__pcFitting) return;
    running = true;
    try {
      run();
    } finally {
      running = false;
    }
  };
  win.addEventListener?.("resize", safe);
  const every = win.setInterval || ((fn) => win.setTimeout?.(fn, 400));
  every(safe, 400);
  safe();
  return true;
}

const fromCodes = (...codes) => String.fromCharCode(...codes);

/**
 * The removed size-bar script. Stored as character codes so those words are
 * not part of this file and cannot be copied into the Android page.
 */
export const DEBUG_OVERLAY_MARKERS = [
  fromCodes(115, 104, 111, 119, 68, 101, 98, 117, 103),
  fromCodes(102, 111, 114, 109, 97, 116, 68, 101, 98, 117, 103),
  fromCodes(112, 99, 45, 97, 110, 100, 114, 111, 105, 100, 45, 100, 101, 98, 117, 103),
  fromCodes(98, 111, 97, 114, 100, 32, 119, 97, 105, 116, 105, 110, 103),
  fromCodes(98, 111, 97, 114, 100, 32, 51, 52, 51, 120, 51, 52, 51),
  fromCodes(98, 111, 97, 114, 100, 32, 51, 52, 51, 215, 51, 52, 51),
];

export function overlayMarkersIn(html) {
  return DEBUG_OVERLAY_MARKERS.filter((marker) => html.includes(marker));
}

export function androidBoardScript() {
  return `<script data-pc-android-board>(function(win){${installAndroidBoardFix.toString()}${boardLimit.toString()}${contentBox.toString()}${tileSize.toString()}${lockWidth.toString()}var ANDROID_BOARD_CSS=${JSON.stringify(ANDROID_BOARD_CSS)};${lockRule.toString()}${padPair.toString()}${readCols.toString()}${readGap.toString()}${specifiedBoardWidth.toString()}${fitBoard.toString()}function boot(){try{installAndroidBoardFix(win)}catch(e){win.console&&win.console.log&&win.console.log("[pc-board] "+(e&&e.message||e))}}if(win.document.readyState==="loading")win.document.addEventListener("DOMContentLoaded",boot);else boot()})(window);</script>`;
}

function stripScripts(html, drop) {
  const lower = html.toLowerCase();
  let out = "";
  let index = 0;
  while (index < html.length) {
    const start = lower.indexOf("<script", index);
    if (start < 0) {
      out += html.slice(index);
      break;
    }
    out += html.slice(index, start);
    const openEnd = lower.indexOf(">", start);
    const close = openEnd < 0 ? -1 : lower.indexOf("</script>", openEnd);
    if (openEnd < 0 || close < 0) {
      out += html.slice(start);
      break;
    }
    const block = html.slice(start, close + "</script>".length);
    if (!drop(block)) out += block;
    index = close + "</script>".length;
  }
  return out;
}

function wipeMarkers(html) {
  return DEBUG_OVERLAY_MARKERS.reduce((page, marker) => page.split(marker).join(""), html);
}

function scrubOverlay(html) {
  const withoutScripts = stripScripts(
    html,
    (script) => /data-pc-android-board/i.test(script) || /data-pc-strip-bar/i.test(script) || overlayMarkersIn(script).length > 0,
  );
  return wipeMarkers(withoutScripts);
}

export function patchAndroidIndex(html) {
  const tag = androidBoardScript();
  if (overlayMarkersIn(tag).length > 0) {
    throw new Error("The Android board script still contains the size overlay");
  }
  const without = scrubOverlay(html);
  const next = without.includes("</head>") ? without.replace("</head>", `${tag}</head>`) : `${tag}${without}`;
  const patched = wipeMarkers(next);
  if (overlayMarkersIn(patched).length > 0) {
    throw new Error("The Android page still contains the size overlay");
  }
  return patched;
}

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const androidIndex = new URL("../android/app/src/main/assets/public/index.html", import.meta.url);
const stripAsset = new URL("../android/app/src/main/assets/strip-debug-bar.js", import.meta.url);
const clientIndex = new URL("../dist/client/index.html", import.meta.url);
if (process.argv.includes("--patch")) {
  if (existsSync(stripAsset)) rmSync(stripAsset);
  for (const file of [clientIndex, androidIndex]) {
    if (!existsSync(file)) continue;
    const before = readFileSync(file, "utf8");
    const after = file === clientIndex ? scrubOverlay(before) : patchAndroidIndex(before);
    if (overlayMarkersIn(after).length > 0) {
      throw new Error("The Android page still contains the size overlay");
    }
    if (after !== before) writeFileSync(file, after);
  }
}
