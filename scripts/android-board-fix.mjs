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

export function formatDebug({ boardWidth, boardHeight, tiles, cell, cols, rows }) {
  const head = `board ${Math.round(boardWidth)}×${Math.round(boardHeight)} cell ${cell} cols ${cols} rows ${rows}`;
  const body = tiles
    .slice(0, 3)
    .map((tile, index) => `t${index} ${Number(tile.width).toFixed(1)}×${Number(tile.height).toFixed(1)}`)
    .join(" ");
  return `${head} ${body}`.trim();
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

function showDebug(doc, text) {
  if (doc.__pcDebuging) return;
  const parent = doc.body || doc.documentElement;
  if (!parent) return;
  doc.__pcDebuging = true;
  try {
    let box = doc.getElementById?.("pc-android-debug");
    if (!box) {
      box = doc.createElement("div");
      box.id = "pc-android-debug";
      box.setAttribute("data-pc-android-debug", "");
      box.style.cssText =
        "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:calc(100vw - 16px);background:rgba(12,18,28,.88);color:#f4efe4;font:600 11px/1.35 ui-monospace,monospace;padding:8px 10px;border-radius:10px;pointer-events:none;white-space:pre;box-shadow:0 8px 24px rgba(0,0,0,.28);";
      parent.appendChild(box);
    }
    box.textContent = text;
  } finally {
    doc.__pcDebuging = false;
  }
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
  const rects = tiles.slice(0, 3).map((tile) => {
    const rect = tile.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const boardRect = board.getBoundingClientRect?.() || { width: width, height: rows * px };
  return {
    cols,
    rows,
    px,
    limit,
    line: formatDebug({
      boardWidth: boardRect.width,
      boardHeight: boardRect.height,
      tiles: rects,
      cell: px,
      cols,
      rows,
    }),
  };
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
    if (win.__pcFitting || doc.__pcDebuging) return;
    try {
      const boards = [...doc.querySelectorAll(".pc-board")];
      const rules = [ANDROID_BOARD_CSS];
      const lines = [];
      boards.forEach((board, index) => {
        const locked = fitBoard(board, win);
        if (!locked) return;
        const key = String(index);
        board.setAttribute("data-pc-lock", key);
        board.setAttribute("data-pc-cell", String(locked.px));
        rules.push(lockRule(key, locked.cols, locked.rows, locked.px, locked.limit));
        lines.push(locked.line);
      });
      const css = rules.join("\n");
      if (style.textContent !== css) style.textContent = css;
      const text = lines.length ? lines.join("\n") : "board waiting";
      showDebug(doc, text);
      if (lines[0] && win.__pcLog !== lines[0]) {
        win.__pcLog = lines[0];
        win.console?.log?.("[pc-board] " + lines[0]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showDebug(doc, "board error " + message);
      win.console?.log?.("[pc-board] " + message);
    }
  };

  let running = false;
  const safe = () => {
    if (running || win.__pcFitting || doc.__pcDebuging) return;
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

export function androidBoardScript() {
  return `<script data-pc-android-board>(function(win){${installAndroidBoardFix.toString()}${boardLimit.toString()}${contentBox.toString()}${tileSize.toString()}${lockWidth.toString()}${formatDebug.toString()}var ANDROID_BOARD_CSS=${JSON.stringify(ANDROID_BOARD_CSS)};${lockRule.toString()}${padPair.toString()}${readCols.toString()}${readGap.toString()}${specifiedBoardWidth.toString()}${showDebug.toString()}${fitBoard.toString()}function boot(){try{installAndroidBoardFix(win)}catch(e){win.console&&win.console.log&&win.console.log("[pc-board] "+(e&&e.message||e))}}if(win.document.readyState==="loading")win.document.addEventListener("DOMContentLoaded",boot);else boot()})(window);</script>`;
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
