import assert from "node:assert/strict";
import test from "node:test";
import {
  fitBoard,
  installAndroidBoardFix,
  isAndroidWebView,
  lockWidth,
  patchAndroidIndex,
  tileSize,
} from "./android-board-fix.mjs";

const chrome =
  "Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const webview =
  "Mozilla/5.0 (Linux; Android 16; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36";

test("Chrome on the device is not the Android WebView", () => {
  assert.equal(isAndroidWebView(chrome), false);
  assert.equal(isAndroidWebView(webview), true);
});

test("tile size is the cell inside the gaps", () => {
  assert.equal(tileSize(300, 5, 8), (300 - 32) / 5);
  assert.equal(tileSize(0, 5, 8), 0);
});

test("a stretched tray does not decide the cell size", () => {
  assert.equal(lockWidth({ viewWidth: 412, trayInner: 880, specifiedInner: 312 }), 312);
  assert.equal(lockWidth({ viewWidth: 412, trayInner: 320, specifiedInner: 312 }), 320);
});

function fakeBoard({ cols, tileCount, tileRect, trayWidth, probeWidth }) {
  const tiles = Array.from({ length: tileCount }, (_, index) => {
    const style = new Map();
    return {
      style: { setProperty: (name, value) => style.set(name, value) },
      getBoundingClientRect: () => tileRect(index),
      dump: style,
    };
  });
  const boardStyle = new Map();
  const shell = { clientWidth: 900, appendChild() {} };
  const board = {
    style: {
      getPropertyValue: (name) => (name === "--pc-cols" ? String(cols) : ""),
      setProperty: (name, value) => boardStyle.set(name, value),
    },
    getAttribute: (name) => board.attrs[name] ?? null,
    setAttribute: (name, value) => {
      board.attrs[name] = value;
    },
    attrs: {},
    parentElement: { clientWidth: trayWidth },
    closest: (sel) => (sel === ".pc-shell" || sel === ".pc-board-wrap" ? shell : null),
    querySelectorAll: () => tiles,
    getBoundingClientRect: () => ({ width: trayWidth, height: trayWidth }),
  };
  const win = {
    innerWidth: 412,
    document: {
      createElement: () => ({
        style: {},
        getBoundingClientRect: () => ({ width: probeWidth }),
        remove() {},
      }),
    },
    getComputedStyle: () => ({
      paddingLeft: "16px",
      paddingRight: "16px",
      columnGap: "8px",
      gap: "8px",
    }),
  };
  return { board, tiles, boardStyle, win };
}

test("a clean grid is still locked to the calculated cell, not the button content", () => {
  const { board, tiles, win } = fakeBoard({
    cols: 5,
    tileCount: 25,
    tileRect: (index) => ({
      left: (index % 5) * 48,
      right: (index % 5) * 48 + 40,
      top: Math.floor(index / 5) * 48,
      bottom: Math.floor(index / 5) * 48 + 40,
      width: 40,
      height: 40,
    }),
    trayWidth: 360,
    probeWidth: 0,
  });
  const locked = fitBoard(board, win);
  assert.ok(locked);
  assert.equal(locked.cols, 5);
  assert.equal(locked.rows, 5);
  assert.notEqual(tiles[0].dump.get("width"), "40px");
  assert.equal(tiles[0].dump.get("width"), tiles[0].dump.get("height"));
  assert.equal(tiles[0].dump.get("min-width"), "0");
});

test("a stretched WebView board is pinned to the live board width", () => {
  const { board, tiles, boardStyle, win } = fakeBoard({
    cols: 2,
    tileCount: 4,
    tileRect: (index) =>
      index === 0
        ? { left: 0, right: 120, top: 0, bottom: 120, width: 120, height: 120 }
        : { left: 50, right: 170, top: 0, bottom: 120, width: 120, height: 120 },
    trayWidth: 880,
    probeWidth: 372,
  });
  const locked = fitBoard(board, win);
  assert.ok(locked);
  const expected = tileSize(372 - 32 - 32, 2, 8);
  const px = Math.round(expected * 100) / 100;
  assert.equal(tiles[0].dump.get("width"), `${px}px`);
  assert.equal(tiles[0].dump.get("height"), `${px}px`);
  assert.match(boardStyle.get("grid-template-columns"), new RegExp(`repeat\\(2, ${px}px\\)`));
});

test("the Android page installs the fit without waiting for a WebView token", () => {
  const created = [];
  const win = {
    navigator: { userAgent: chrome },
    console: { log() {} },
    document: {
      readyState: "complete",
      body: { appendChild() {} },
      documentElement: {},
      head: { appendChild(node) { created.push(node); } },
      createElement: () => ({ setAttribute() {}, textContent: "", style: {} }),
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener() {},
    },
    addEventListener() {},
    setTimeout() {},
    setInterval() {},
    MutationObserver: class {
      observe() {}
    },
  };
  assert.equal(installAndroidBoardFix(win), true);
  assert.equal(created.length, 1);
});

test("the Android index carries the fit and not the size overlay", () => {
  const once = patchAndroidIndex('<head><link rel="stylesheet" href="/assets/styles-abc.css"></head>');
  assert.match(once, /data-pc-android-board/);
  assert.match(once, /min-width:0!important/);
  assert.doesNotMatch(once, /pc-android-debug/);
  assert.doesNotMatch(once, /board waiting/);
  assert.equal(patchAndroidIndex(once), once);
  assert.doesNotMatch(once, /if\(!isAndroidShell/);
});
