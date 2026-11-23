/**
 * Android System WebView hydrates the prerendered board, then React error #418
 * throws that tree away and builds it again. The rebuilt lighting nodes land
 * off their tiles. This WebView skips that HTML: the first client render is an
 * empty board, and the tiles mount after hydration.
 *
 * The website and iOS never set the flag, so their prerendered boards hydrate
 * as they do today.
 */

export const CLIENT_BOARD_FLAG = "__pcClientBoard";

type ClientBoardWindow = Window & { [CLIENT_BOARD_FLAG]?: boolean };

export function isAndroidWebView(userAgent: string): boolean {
  return /Android/i.test(userAgent) && /;\s*wv\)/.test(userAgent);
}

/** True only after `prepareAndroidClientBoard` has run in this WebView. */
export function deferBoardOnThisClient(): boolean {
  if (typeof window === "undefined") return false;
  return (window as ClientBoardWindow)[CLIENT_BOARD_FLAG] === true;
}

/** Drop the prerendered tiles and mark this document before React hydrates. */
export function prepareAndroidClientBoard(win: ClientBoardWindow): boolean {
  const agent = win.navigator?.userAgent ?? "";
  if (!isAndroidWebView(agent)) return false;
  win[CLIENT_BOARD_FLAG] = true;
  win.document?.querySelectorAll(".pc-board").forEach((node) => {
    node.replaceChildren();
  });
  return true;
}
