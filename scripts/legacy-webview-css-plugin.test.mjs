import assert from "node:assert/strict";
import test from "node:test";
import {
  MIX_SOURCE_SELECTOR,
  legacyWebViewCss,
  lowerMediaRanges,
} from "./legacy-webview-css-plugin.mjs";

test("dvh reads a variable that only legacy engines set", () => {
  const { css } = legacyWebViewCss(".a{min-height:100dvh}.min-h-\\[90dvh\\]{max-height:90dvh}");
  assert.match(css, /\.a\{min-height:calc\(100 \* var\(--pc-dvh, 1dvh\)\)\}/);
  assert.match(css, /\.min-h-\\\[90dvh\\\]\{max-height:calc\(90 \* var\(--pc-dvh, 1dvh\)\)\}/);
});

test("each modern color keeps itself as the fallback and is listed once", () => {
  const mix = "color-mix(in oklab, var(--color-pc-flow) 42%, var(--color-pc-tile))";
  const { css, mixes } = legacyWebViewCss(
    `.a{background:${mix}}.b{box-shadow:0 1px 0 ${mix}, 0 0 0 oklch(63.7% .237 25.331)}`,
  );
  assert.equal(mixes, 2);
  assert.ok(css.includes(`.a{background:var(--pc-mix-0, ${mix})}`));
  assert.ok(css.includes(`0 1px 0 var(--pc-mix-0, ${mix}), 0 0 0 var(--pc-mix-1, oklch(`));
  assert.ok(css.includes(`${MIX_SOURCE_SELECTOR}{--pc-mix-src-0:${mix};--pc-mix-src-1:oklch(`));
});

test("the minifier's fixed fallback reads the same variable first", () => {
  const mix = "color-mix(in oklab, var(--color-pc-flow) 42%, var(--color-pc-tile))";
  const { css } = legacyWebViewCss(
    `.t{background:#197766}@supports (color:color-mix(in lab, red, red)){.t{background:${mix}}}`,
  );
  assert.ok(css.startsWith(".t{background:var(--pc-mix-0, #197766)}"));
  assert.ok(css.includes(`{.t{background:var(--pc-mix-0, ${mix})}}`));
  assert.ok(css.includes("@supports (color:color-mix(in lab, red, red))"));
});

test("range media queries become min/max width", () => {
  assert.equal(
    lowerMediaRanges("(width>=720px) and (width<=959px)"),
    "(min-width: 720px) and (max-width: 959px)",
  );
  assert.equal(lowerMediaRanges("not all and (width>=48rem)"), "not all and (min-width: 48rem)");
  assert.equal(lowerMediaRanges("(width<40rem)"), "(max-width: calc(40rem - 0.02px))");
  assert.equal(lowerMediaRanges("(hover:hover)"), "(hover:hover)");
});

test("a :has() selector no longer takes its list down with it", () => {
  const { css } = legacyWebViewCss(".a,.b:has(.c),.d{display:none}");
  assert.equal(css, ".a,.d{display:none}.b:has(.c){display:none}");
});

test("game translate rules get a transform twin for engines without translate", () => {
  const { css } = legacyWebViewCss(
    ".pc-tip{translate:-50% calc(-100% - 12px)}.tw{translate:var(--x) var(--y)}",
  );
  assert.ok(
    css.includes(
      ".pc-tip{translate:-50% calc(-100% - 12px)}@supports not (translate: 0){.pc-tip{transform:translate(-50%, calc(-100% - 12px))}}",
    ),
  );
  assert.ok(!css.includes(".tw{transform"));
});
