import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  DEBUG_OVERLAY_MARKERS,
  debugBarProgram,
  fitBoard,
  installAndroidBoardFix,
  installDebugBarStrip,
  isAndroidWebView,
  isDebugBar,
  lockWidth,
  overlayMarkersIn,
  overlayMarkersOutsideStrip,
  patchAndroidIndex,
  removeDebugBars,
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
  assert.match(once, /data-pc-strip-bar/);
  assert.match(once, /MutationObserver/);
  assert.match(once, /min-width:0!important/);
  assert.deepEqual(overlayMarkersOutsideStrip(once), []);
  assert.equal(once.indexOf("data-pc-strip-bar") < once.indexOf("data-pc-android-board"), true);
  assert.equal(patchAndroidIndex(once), once);
  assert.doesNotMatch(once, /if\(!isAndroidShell/);
});

test("a page that already has the size bar loses it on sync", () => {
  const [first, second, third, waiting, sized] = DEBUG_OVERLAY_MARKERS;
  const stale =
    `<head><p>${first} ${second} ${third} ${waiting} ${sized}</p>` +
    `<script data-pc-android-board>function ${first}(){return "${sized}"}</script>` +
    `<script>function ${second}(){return "${waiting}"}</script></head>`;
  const once = patchAndroidIndex(stale);
  assert.deepEqual(overlayMarkersOutsideStrip(once), []);
  assert.equal(once.includes(first), false);
  assert.equal(once.includes(second), false);
  assert.equal(once.includes(waiting), false);
  assert.equal(once.includes(sized), false);
  assert.equal(once.includes(third), true);
  assert.match(once, /min-width:0!important/);
  assert.equal(patchAndroidIndex(once), once);
});

function debugHost(nodes) {
  let observer = null;
  let interval = null;
  const win = {
    innerHeight: 800,
    document: {
      documentElement: {
        clientHeight: 800,
        querySelectorAll: () => nodes.filter((node) => !node.__pcDropped),
      },
      getElementById: (id) => nodes.find((node) => node.id === id && !node.__pcDropped) ?? null,
      addEventListener() {},
    },
    getComputedStyle: (el) => el.computed || {},
    MutationObserver: class {
      constructor(callback) {
        observer = callback;
      }
      observe() {}
    },
    setInterval(callback) {
      interval = callback;
    },
    setTimeout() {},
  };
  return {
    win,
    fire() {
      observer?.();
    },
    tick() {
      interval?.();
    },
  };
}

function debugNode(overrides) {
  return {
    id: "",
    tagName: "DIV",
    textContent: "",
    className: "",
    children: [],
    computed: {},
    style: { setProperty() {} },
    getBoundingClientRect() {
      return { top: 760, bottom: 796, height: 36 };
    },
    remove() {
      this.removed = true;
    },
    ...overrides,
  };
}

test("the known debug element is removed even before it looks like a bar", () => {
  const node = debugNode({
    id: "pc-android-debug",
    textContent: "",
    computed: { position: "static", backgroundColor: "transparent" },
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 }),
  });
  const { win } = debugHost([node]);
  assert.equal(removeDebugBars(win), 1);
  assert.equal(node.removed, true);
});

test("a black board-size bar at the bottom is removed", () => {
  const node = debugNode({
    textContent: "board 343x343 · 49 cells · 7 rows",
    computed: { position: "fixed", bottom: "8px", backgroundColor: "rgb(0, 0, 0)" },
  });
  const { win } = debugHost([node]);
  assert.equal(isDebugBar(node, win), true);
  assert.equal(removeDebugBars(win), 1);
  assert.equal(node.removed, true);
});

test("a black bar keeps the label in a child and still comes off", () => {
  const node = debugNode({
    textContent: "board 343x343 · 49 cells",
    computed: { position: "fixed", bottom: "8px", backgroundColor: "rgb(0, 0, 0)" },
    children: [{ textContent: "board 343x343 · 49 cells" }],
  });
  const { win } = debugHost([node]);
  assert.equal(removeDebugBars(win), 1);
  assert.equal(node.removed, true);
});

test("a tall panel and a bar that is not at the bottom stay", () => {
  const tall = debugNode({
    textContent: "board 343x343 · 49 cells",
    computed: { position: "fixed", bottom: "0px", backgroundColor: "rgb(0, 0, 0)" },
    getBoundingClientRect: () => ({ top: 200, bottom: 800, height: 600 }),
  });
  const middle = debugNode({
    textContent: "board 343x343 · 49 cells",
    computed: { position: "absolute", backgroundColor: "#000" },
    getBoundingClientRect: () => ({ top: 120, bottom: 156, height: 36 }),
  });
  const { win } = debugHost([tall, middle]);
  assert.equal(removeDebugBars(win), 0);
  assert.equal(tall.removed, undefined);
  assert.equal(middle.removed, undefined);
});

test("the game chrome stays even when it mentions the board", () => {
  const note = debugNode({
    className: "pc-bottom",
    textContent: "Back to the board",
    computed: { position: "fixed", bottom: "12px", backgroundColor: "rgb(246, 241, 232)", height: "80px" },
    getBoundingClientRect: () => ({ top: 700, bottom: 790, height: 90 }),
  });
  const { win } = debugHost([note]);
  assert.equal(isDebugBar(note, win), false);
  assert.equal(removeDebugBars(win), 0);
  assert.equal(note.removed, undefined);
});

test("a bar added after the Android page loads is removed", () => {
  const { win, fire, tick } = debugHost([]);
  assert.equal(installDebugBarStrip(win), true);
  const late = debugNode({
    id: "pc-android-debug",
    textContent: "board 343x343 · 49 cells",
    computed: { position: "fixed", bottom: "8px", backgroundColor: "#000" },
  });
  win.document.documentElement.querySelectorAll = () => [late];
  win.document.getElementById = () => late;
  fire();
  assert.equal(late.removed, true);

  const later = debugNode({
    textContent: "board 200x200 · 16 cells",
    computed: { position: "fixed", bottom: "0px", backgroundColor: "rgb(8, 8, 8)" },
  });
  win.document.documentElement.querySelectorAll = () => [later];
  win.document.getElementById = () => null;
  tick();
  assert.equal(later.removed, true);
  assert.equal(installDebugBarStrip(win), true);
});

test("the packaged stripper matches the script the WebView loads", () => {
  const program = `${debugBarProgram()}\n`;
  const asset = readFileSync(new URL("../android/app/src/main/assets/strip-debug-bar.js", import.meta.url), "utf8");
  const java = readFileSync(
    new URL("../android/app/src/main/java/com/cbmenes/pathconnect/MainActivity.java", import.meta.url),
    "utf8",
  );
  assert.equal(asset, program);
  assert.match(java, /strip-debug-bar\.js/);
  assert.match(java, /onPageStarted[\s\S]*installDebugBarStrip\(view\)/);
  assert.deepEqual(
    overlayMarkersIn(program).filter((marker) => marker !== "pc-android-debug"),
    [],
  );
  const nodes = [];
  const context = {
    window: {
      innerHeight: 800,
      document: {
        documentElement: { querySelectorAll: () => nodes, clientHeight: 800 },
        getElementById: (id) => nodes.find((node) => node.id === id) ?? null,
        addEventListener() {},
      },
      getComputedStyle: (el) => el.computed || {},
      MutationObserver: class {
        observe() {}
      },
      setInterval() {},
      setTimeout() {},
    },
  };
  vm.createContext(context);
  vm.runInContext(program, context);
  const node = debugNode({ id: "pc-android-debug", textContent: "board 10x10 · 4 cells" });
  nodes.push(node);
  context.window.__pcStripDebugBar = false;
  vm.runInContext(program, context);
  assert.equal(node.removed, true);
});
