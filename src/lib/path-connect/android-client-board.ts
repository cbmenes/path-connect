/**
 * Android System WebView hydrates the prerendered page, then React error #418
 * throws the tree away and builds the lighting nodes again, off their tiles.
 * This WebView never hydrates. The packaged page carries no board markup, and
 * the board element is created after the client has mounted.
 *
 * The website and iOS never set the flag, so they still hydrate the
 * prerendered board.
 */

export const CLIENT_BOARD_FLAG = "__pcClientBoard";

type ClientBoardWindow = Window & { [CLIENT_BOARD_FLAG]?: boolean };

export function isAndroidWebView(userAgent: string): boolean {
  return /Android/i.test(userAgent) && /;\s*wv\)/.test(userAgent);
}

/** True only after this WebView has been marked for a client-only board. */
export function deferBoardOnThisClient(): boolean {
  if (typeof window === "undefined") return false;
  return (window as ClientBoardWindow)[CLIENT_BOARD_FLAG] === true;
}

/**
 * Mark the Android document before React starts. An inline script in the
 * packaged page sets the flag even when the user agent omits `wv`. The
 * WebView user agent is the fallback for a page that was not patched.
 * Every prerendered board node is removed so none of it can be hydrated.
 */
export function prepareAndroidClientBoard(win: ClientBoardWindow): boolean {
  const agent = win.navigator?.userAgent ?? "";
  const marked = win[CLIENT_BOARD_FLAG] === true;
  if (!marked && !isAndroidWebView(agent)) return false;
  win[CLIENT_BOARD_FLAG] = true;
  win.document?.querySelectorAll(".pc-board").forEach((node) => {
    node.remove();
  });
  return true;
}
