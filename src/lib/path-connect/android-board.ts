/**
 * Android System WebView still ships, on some emulator images, an engine that
 * drops `dvh`, `aspect-ratio`, or `repeat(var(--pc-cols), …)` for the whole
 * declaration. The board width then becomes indefinite, every tile collapses
 * into the same spot, and the pipes paint on top of each other.
 *
 * This lays the cozy board out in plain pixel tracks. It runs only when
 * Capacitor reports the Android shell, so the website and the iOS build keep
 * the stylesheet exactly as it is. The numbers match the cozy rules in
 * styles.css, with the visible viewport standing in for `100dvh` (a fullscreen
 * WebView has no browser chrome, so the two are the same length).
 */

export interface BoardSpace {
  width: number;
  height: number;
}

export interface BoardPlan {
  wrap: number;
  pad: number;
  gap: number;
  tile: number;
  inner: number;
  boardHeight: number;
}

interface AndroidHost {
  Capacitor?: { getPlatform?: () => string };
  innerWidth: number;
  innerHeight: number;
  visualViewport?: { width: number; height: number } | null;
  document: Document;
}

export function isAndroidShell(win: AndroidHost = window): boolean {
  return win.Capacitor?.getPlatform?.() === "android";
}

/** Visible CSS pixels. Falls back when a WebView reports an empty visual viewport. */
export function androidViewport(win: AndroidHost): BoardSpace {
  const view = win.visualViewport;
  const width = view && view.width > 0 ? view.width : win.innerWidth;
  const height = view && view.height > 0 ? view.height : win.innerHeight;
  return { width, height };
}

/**
 * Gives `--pc-dvh` a real length so `calc(100 * var(--pc-dvh, 1dvh))` cannot
 * be invalid or zero. One hundred steps of this value are the visible height.
 */
export function pinAndroidViewport(win: AndroidHost): void {
  const { height } = androidViewport(win);
  if (!(height >= 100)) return;
  win.document.documentElement.style.setProperty("--pc-dvh", `${height / 100}px`);
}

/** Tile box inside a wrap of `wrap` px with the tray padding and grid gap. */
export function planFixed(
  wrap: number,
  cols: number,
  rows: number,
  pad: number,
  gap: number,
): BoardPlan | null {
  if (cols < 1 || rows < 1 || !(wrap > 0)) return null;
  const inner = wrap - pad * 2;
  const tile = (inner - gap * (cols - 1)) / cols;
  if (!(tile > 0)) return null;
  return {
    wrap,
    pad,
    gap,
    tile,
    inner,
    boardHeight: rows * tile + gap * (rows - 1),
  };
}

/**
 * The cozy board width. Phones (under 720px) and wider windows use the same
 * caps, gutters, and floors as styles.css. A 7×8 or 7×9 on a wide window uses
 * the shorter cap so the extra rows do not shrink the tiles.
 */
export function planAndroidBoard(
  width: number,
  height: number,
  cols: number,
  rows: number,
): BoardPlan | null {
  if (!(width >= 100) || !(height >= 100) || cols < 1 || rows < 1) return null;
  const phone = width < 720;
  const tall = !phone && rows >= 8;
  let cap: number;
  let gutter: number;
  let floor: number;
  let reserve: number;
  if (tall) {
    cap = 520;
    gutter = 76;
    floor = 0;
    reserve = 370;
  } else if (cols >= 7) {
    cap = 540;
    gutter = phone ? 24 : 28;
    floor = phone ? 320 : 340;
    reserve = phone ? 300 : 320;
  } else if (cols >= 6) {
    cap = 500;
    gutter = phone ? 32 : 44;
    floor = phone ? 300 : 320;
    reserve = phone ? 300 : 330;
  } else {
    cap = 460;
    gutter = phone ? 40 : 76;
    floor = phone ? 280 : 300;
    reserve = phone ? 300 : 340;
  }
  const across = width - gutter;
  const down = height - reserve;
  const wrap = tall ? Math.min(cap, across, down) : Math.min(cap, across, Math.max(floor, down));
  const pad = cols >= 7 ? 11 : 14;
  const gap = cols >= 7 ? 6 : cols >= 6 ? 7 : 8;
  return planFixed(wrap, cols, rows, pad, gap);
}

const px = (value: number) => `${Math.round(value * 1000) / 1000}px`;

/** Writes the pixel grid onto the wrap, the tray, and each direct tile. */
export function applyAndroidBoard(
  wrap: HTMLElement,
  tray: HTMLElement,
  board: HTMLElement,
  plan: BoardPlan,
  cols: number,
  rows: number,
): void {
  wrap.style.width = px(plan.wrap);
  tray.style.boxSizing = "border-box";
  tray.style.padding = px(plan.pad);
  board.style.display = "grid";
  board.style.boxSizing = "border-box";
  board.style.position = "relative";
  board.style.width = px(plan.inner);
  board.style.height = px(plan.boardHeight);
  board.style.gridTemplateColumns = `repeat(${cols}, ${px(plan.tile)})`;
  board.style.gridTemplateRows = `repeat(${rows}, ${px(plan.tile)})`;
  board.style.gap = px(plan.gap);
  board.style.alignContent = "start";
  board.style.justifyContent = "start";
  const tiles = board.querySelectorAll<HTMLElement>(":scope > .pc-tile");
  tiles.forEach((tile, index) => {
    tile.style.boxSizing = "border-box";
    tile.style.width = px(plan.tile);
    tile.style.height = px(plan.tile);
    tile.style.minWidth = "0";
    tile.style.minHeight = "0";
    tile.style.margin = "0";
    tile.style.padding = "0";
    tile.style.gridColumn = String((index % cols) + 1);
    tile.style.gridRow = String(Math.floor(index / cols) + 1);
  });
}
