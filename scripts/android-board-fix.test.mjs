import assert from "node:assert/strict";
import test from "node:test";
import {
  boardLimit,
  fitBoard,
  installAndroidBoardFix,
  isAndroidWebView,
  patchAndroidIndex,
  tileSize,
  tilesOverlap,
} from "./android-board-fix.mjs";

const chrome =
  "Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const webview =
  "Mozilla/5.0 (Linux; Android 16; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36";

test("the live site in Chrome is not treated as the Android app", () => {
  assert.equal(isAndroidWebView(chrome), false);
  assert.equal(isAndroidWebView(webview), true);
});

test("tile size is the cell inside the gaps", () => {
  assert.equal(tileSize(300, 5, 8), (300 - 32) / 5);
  assert.equal(tileSize(0, 5, 8), 0);
});

test("board width stays inside the screen when the tray has been stretched", () => {
  const limit = boardLimit({
    viewWidth: 412,
    shellPad: 32,
    scenePad: 32,
    trayPad: 28,
    sceneWidth: 900,
    trayWidth: 880,
  });
  assert.equal(limit, 412 - 32 - 32 - 28);
});

test("overlapping squares are detected and a clean row is not", () => {
  const clean = [
    { left: 0, right: 40, top: 0, bottom: 40, width: 40, height: 40 },
    { left: 48, right: 88, top: 0, bottom: 40, width: 40, height: 40 },
  ];
  assert.equal(tilesOverlap(clean, 2), false);
  const overlap = [
    { left: 0, right: 80, top: 0, bottom: 80, width: 80, height: 80 },
    { left: 40, right: 120, top: 0, bottom: 80, width: 80, height: 80 },
  ];
  assert.equal(tilesOverlap(overlap, 2), true);
});

test("a stretched WebView board is pinned to the live board width", () => {
  const tiles = [0, 1, 2, 3].map(() => {
    const style = new Map();
    return {
      style: { setProperty: (name, value) => style.set(name, value) },
      getBoundingClientRect: () => ({ left: 0, right: 120, top: 0, bottom: 120, width: 120, height: 120 }),
      dump: style,
    };
  });
  tiles[1].getBoundingClientRect = () => ({ left: 50, right: 170, top: 0, bottom: 120, width: 120, height: 120 });
  const boardStyle = new Map();
  const shell = {
    clientWidth: 900,
    appendChild() {},
  };
  const board = {
    style: {
      getPropertyValue: (name) => (name === "--pc-cols" ? "2" : ""),
      setProperty: (name, value) => boardStyle.set(name, value),
    },
    getAttribute: (name) => board.attrs[name] ?? null,
    setAttribute: (name, value) => {
      board.attrs[name] = value;
    },
    attrs: {},
    parentElement: { clientWidth: 880 },
    closest: (sel) => (sel === ".pc-shell" || sel === ".pc-board-wrap" ? shell : null),
    querySelectorAll: () => tiles,
  };
  const win = {
    innerWidth: 412,
    document: {
      createElement: () => ({
        style: {},
        getBoundingClientRect: () => ({ width: 372 }),
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
  assert.equal(fitBoard(board, win), true);
  // 372px scene, 32px scene padding, 32px tray padding.
  const expected = tileSize(372 - 32 - 32, 2, 8);
  const px = Math.round(expected * 100) / 100;
  assert.equal(tiles[0].dump.get("width"), `${px}px`);
  assert.equal(tiles[0].dump.get("height"), `${px}px`);
  assert.equal(tiles[0].dump.get("min-width"), "0");
  assert.match(boardStyle.get("grid-template-columns"), new RegExp(`repeat\\(2, ${px}px\\)`));
});

test("Chrome never receives the board fit", () => {
  const created = [];
  const win = {
    navigator: { userAgent: chrome },
    document: {
      head: { appendChild(node) { created.push(node); } },
      documentElement: {},
      createElement: () => ({ setAttribute() {}, textContent: "" }),
      querySelectorAll: () => [],
    },
    addEventListener() {},
    setTimeout() {},
  };
  assert.equal(installAndroidBoardFix(win), false);
  assert.equal(created.length, 0);
});

test("the Android index is patched once", () => {
  const once = patchAndroidIndex("<head><link rel=\"stylesheet\" href=\"/assets/styles-abc.css\"></head>");
  assert.match(once, /data-pc-android-board/);
  assert.match(once, /min-width:0!important/);
  assert.equal(patchAndroidIndex(once), once);
});
