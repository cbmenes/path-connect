import assert from "node:assert/strict";
import test from "node:test";
import {
  CLIENT_BOARD_FLAG,
  deferBoardOnThisClient,
  isAndroidWebView,
  prepareAndroidClientBoard,
} from "./android-client-board.ts";

const WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";

test("only the Android WebView defers the board", () => {
  assert.equal(isAndroidWebView(WEBVIEW), true);
  assert.equal(
    isAndroidWebView(
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    ),
    false,
  );
  assert.equal(
    isAndroidWebView(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    ),
    false,
  );
  assert.equal(deferBoardOnThisClient(), false);
});

test("preparing the Android document removes the prerendered board", () => {
  const boards: Array<{ removed: boolean; remove: () => void }> = [];
  const win = {
    navigator: { userAgent: WEBVIEW },
    document: {
      querySelectorAll: () => boards,
    },
  } as unknown as Window & { [CLIENT_BOARD_FLAG]?: boolean };
  boards.push({
    removed: false,
    remove() {
      this.removed = true;
    },
  });
  assert.equal(prepareAndroidClientBoard(win), true);
  assert.equal(win[CLIENT_BOARD_FLAG], true);
  assert.equal(boards[0]?.removed, true);

  const flagged = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0.0.0" },
    document: { querySelectorAll: () => boards },
    [CLIENT_BOARD_FLAG]: true,
  } as unknown as Window & { [CLIENT_BOARD_FLAG]?: boolean };
  assert.equal(prepareAndroidClientBoard(flagged), true);

  const browser = {
    navigator: { userAgent: "Mozilla/5.0 Chrome/120.0.0.0" },
    document: { querySelectorAll: () => boards },
  } as unknown as Window & { [CLIENT_BOARD_FLAG]?: boolean };
  assert.equal(prepareAndroidClientBoard(browser), false);
});
