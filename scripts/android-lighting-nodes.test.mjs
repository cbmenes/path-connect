import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const activity = readFileSync(
  join(root, "android/app/src/main/java/com/cbmenes/pathconnect/MainActivity.java"),
  "utf8",
);

test("Android keeps lighting nodes inside the tile and still fills the other tile art", () => {
  assert.match(activity, /\.pc-tile svg:not\(\.pc-lamp\):not\(\.pc-bulb\)\{[^}]*width:100%/);
  assert.match(
    activity,
    /\[data-theme=\\"lights\\"\] \.pc-tile \.pc-lamp,\[data-theme=\\"lights\\"\] \.pc-tile \.pc-bulb\{display:block!important;width:62%!important;height:auto!important;max-width:62%!important;max-height:78%!important/,
  );
  assert.equal(activity.includes(".pc-tile svg{display:block!important;width:100%"), false);
});
