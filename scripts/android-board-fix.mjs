/**
 * Android System WebView lays the same stylesheet out differently from Chrome
 * on the same device. Cozy tiles are buttons with overflow visible, so the
 * WebView keeps each button at its content size and the buttons paint over
 * the cells beside them. Chrome shrinks those buttons into the grid.
 *
 * This file is copied only into the Android asset index. The website and the
 * iOS bundle never receive it.
 */

export function isAndroidWebView(userAgent) {
  const ua = String(userAgent ?? "");
  return /Android/i.test(ua) && /;\s*wv\)/.test(ua);
}

export function isAndroidShell(win) {
  if (isAndroidWebView(win?.navigator?.userAgent)) return true;
  try {
    const cap = win?.Capacitor;
    return cap?.getPlatform?.() === "android" || cap?.platform === "android";
  } catch {
    return false;
  }
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

export function tilesOverlap(rects, cols) {
  if (!rects.length || !(cols > 0)) return false;
  const across = Math.min(cols, rects.length);
  for (let i = 0; i < across; i += 1) {
    const rect = rects[i];
    if (!(rect.width > 8) || Math.abs(rect.width - rect.height) > 1.5) return true;
    if (i > 0 && rect.left < rects[i - 1].right - 1) return true;
  }
  if (rects.length > cols) {
    const first = rects[0];
    const below = rects[cols];
    if (below.top < first.bottom - 1) return true;
  }
  return false;
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

function padPair(style) {
  return (parseFloat(style?.paddingLeft) || 0) + (parseFloat(style?.paddingRight) || 0);
}

function readCols(board) {
  const fromStyle = parseInt(board.style?.getPropertyValue?.("--pc-cols") || "", 10);
  if (fromStyle > 0) return fromStyle;
  const tiles = board.querySelectorAll(":scope > .pc-tile").length;
  return tiles > 0 ? Math.round(Math.sqrt(tiles)) || tiles : 5;
}

function readGap(board, win) {
  const style = win.getComputedStyle(board);
  const gap = parseFloat(style.columnGap || style.gap);
  return Number.isFinite(gap) && gap >= 0 ? gap : 0;
}

/**
 * @param {HTMLElement} board
 * @param {Window} win
 */
export function fitBoard(board, win) {
  const tiles = [...board.querySelectorAll(":scope > .pc-tile")];
  if (!tiles.length) return false;
  const cols = readCols(board);
  const rects = tiles.map((tile) => tile.getBoundingClientRect());
  const pinned = board.style.getPropertyPriority?.("grid-template-columns") === "important";
  if (!tilesOverlap(rects, cols) && !pinned) {
    board.setAttribute("data-pc-fit", "ok");
    return false;
  }

  const doc = win.document;
  const shell = board.closest?.(".pc-shell") || doc.documentElement;
  const scene = board.closest?.(".pc-board-wrap");
  const tray = board.parentElement;
  const sceneStyle = scene ? win.getComputedStyle(scene) : null;
  const trayStyle = tray ? win.getComputedStyle(tray) : null;
  const scenePad = padPair(sceneStyle);
  const trayPad = padPair(trayStyle);
  let specified = 0;
  if (doc.createElement && shell.appendChild) {
    win.__pcFitting = true;
    const probe = doc.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:0;min-width:0;width:var(--pc-board);";
    shell.appendChild(probe);
    specified = probe.getBoundingClientRect?.().width || 0;
    probe.remove?.();
    win.__pcFitting = false;
  }
  const fromRule = contentBox(specified, scenePad, trayPad);
  const limit =
    fromRule ||
    boardLimit({
      viewWidth: win.innerWidth,
      shellPad: padPair(win.getComputedStyle(shell)),
      scenePad,
      trayPad,
      sceneWidth: scene?.clientWidth || 0,
      trayWidth: tray?.clientWidth || 0,
    });
  const size = tileSize(limit, cols, readGap(board, win));
  if (!size) return false;
  const rows = Math.ceil(tiles.length / cols);
  const px = Math.round(size * 100) / 100;
  const signature = `${cols}:${rows}:${px}:${tiles.length}`;
  if (board.getAttribute("data-pc-fit") === signature) return false;
  board.style.setProperty("width", `${Math.round(limit * 100) / 100}px`, "important");
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
    tile.style.setProperty("padding", "0", "important");
  }
  board.setAttribute("data-pc-fit", signature);
  return true;
}

export function installAndroidBoardFix(win) {
  if (!win?.document || !isAndroidShell(win)) return false;
  if (win.__pcAndroidBoard) return true;
  win.__pcAndroidBoard = true;
  const doc = win.document;
  const style = doc.createElement("style");
  style.setAttribute("data-pc-android-board", "");
  style.textContent = ANDROID_BOARD_CSS;
  (doc.head || doc.documentElement).appendChild(style);

  let scheduled = false;
  const schedule = () => {
    if (scheduled || win.__pcFitting) return;
    scheduled = true;
    const raf = win.requestAnimationFrame || ((fn) => win.setTimeout(fn, 16));
    raf(() => {
      scheduled = false;
      for (const board of doc.querySelectorAll(".pc-board")) fitBoard(board, win);
    });
  };
  if (typeof win.MutationObserver === "function") {
    new win.MutationObserver(schedule).observe(doc.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  win.addEventListener?.("resize", schedule);
  schedule();
  return true;
}

export function androidBoardScript() {
  return `<script data-pc-android-board>(function(win){${installAndroidBoardFix.toString()}function isAndroidWebView(userAgent){return /Android/i.test(String(userAgent||""))&&/;\\s*wv\\)/.test(String(userAgent||""))}function isAndroidShell(w){if(isAndroidWebView(w?.navigator?.userAgent))return true;try{var cap=w?.Capacitor;return cap?.getPlatform?.()==="android"||cap?.platform==="android"}catch(e){return false}}${boardLimit.toString()}${contentBox.toString()}${tileSize.toString()}${tilesOverlap.toString()}var ANDROID_BOARD_CSS=${JSON.stringify(ANDROID_BOARD_CSS)};${padPair.toString()}${readCols.toString()}${readGap.toString()}${fitBoard.toString()}function boot(){if(win.__pcAndroidBoard||!isAndroidShell(win))return;installAndroidBoardFix(win)}boot();win.addEventListener&&win.addEventListener("DOMContentLoaded",boot);win.setTimeout&&win.setTimeout(boot,300)})(window);</script>`;
}

export function patchAndroidIndex(html) {
  const tag = androidBoardScript();
  const existing = /<script data-pc-android-board>[\s\S]*?<\/script>/;
  if (existing.test(html)) return html.replace(existing, tag);
  if (html.includes("</head>")) return html.replace("</head>", `${tag}</head>`);
  return `${tag}${html}`;
}

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const androidIndex = new URL("../android/app/src/main/assets/public/index.html", import.meta.url);
if (process.argv.includes("--patch")) {
  if (!existsSync(androidIndex)) process.exit(0);
  const before = readFileSync(androidIndex, "utf8");
  const after = patchAndroidIndex(before);
  if (after !== before) writeFileSync(androidIndex, after);
}
